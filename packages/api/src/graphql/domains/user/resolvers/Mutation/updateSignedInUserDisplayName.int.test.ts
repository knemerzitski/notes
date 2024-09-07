/* eslint-disable @typescript-eslint/unbound-method */

import { faker } from '@faker-js/faker';
import { UpdateResult } from 'mongodb';
import { MockInstance, beforeAll, vi, afterEach, beforeEach, it, expect } from 'vitest';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';
import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
  mockSubscriptionsModel,
  createMockedPublisher,
  mockSocketApi,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__test__/helpers/graphql/response';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../../../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/user';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import {
  UpdateSignedInUserDisplayNameInput,
  UpdateSignedInUserDisplayNamePayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../Subscription/signedInUserEvents';
import * as serviceUser from '../../../../../services/user/user';

interface Variables {
  input: UpdateSignedInUserDisplayNameInput;
}

const MUTATION = `#graphql
  mutation($input: UpdateSignedInUserDisplayNameInput!){
    updateSignedInUserDisplayName(input: $input) {
      displayName
      signedInUser {
        id
        public {
          profile {
            displayName
          }
        }
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    signedInUserEvents {
      mutations {
        __typename
        ... on UpdateSignedInUserDisplayNamePayload {
          displayName
          signedInUser {
            id
            public {
              profile {
                displayName
              }
            }
          }
        }
      }
    }
  }
`;

let user: DBUserSchema;

let spyUpdateDisplayName: MockInstance<
  [serviceUser.UpdateDisplayNameParams],
  Promise<UpdateResult<DBUserSchema>>
>;

beforeAll(() => {
  spyUpdateDisplayName = vi.spyOn(serviceUser, 'updateDisplayName');
});

afterEach(() => {
  spyUpdateDisplayName.mockClear();
});

beforeEach(async () => {
  faker.seed(76575);
  await resetDatabase();

  user = fakeUserPopulateQueue({
    override: {
      profile: {
        displayName: 'none',
      },
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateSignedInUserDisplayName: UpdateSignedInUserDisplayNamePayload;
    },
    Variables
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('changes user displayName', async () => {
  const response = await executeOperation(
    {
      displayName: 'new name',
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    updateSignedInUserDisplayName: {
      displayName: 'new name',
      signedInUser: {
        id: objectIdToStr(user._id),
        public: {
          profile: {
            displayName: 'new name',
          },
        },
      },
    },
  });

  expect(spyUpdateDisplayName).toHaveBeenCalledWith({
    userId: user._id,
    displayName: 'new name',
    collection: mongoCollections.users,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
});

it('publishes displayName payload', async () => {
  mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
    {
      subscription: {
        query: SUBSCRIPTION,
      },
    } as Subscription,
  ]);

  const response = await executeOperation(
    {
      displayName: 'new name 2',
    },
    {
      user,
      createPublisher: createMockedPublisher,
    }
  );

  expectGraphQLResponseData(response);

  expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
    signedInUserTopic(user._id)
  );
  expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

  expect(mockSocketApi.post).toHaveBeenLastCalledWith({
    message: expect.objectContaining({
      type: 'next',
      payload: {
        data: {
          signedInUserEvents: {
            mutations: [
              {
                __typename: 'UpdateSignedInUserDisplayNamePayload',
                displayName: 'new name 2',
                signedInUser: {
                  id: objectIdToStr(user._id),
                  public: {
                    profile: {
                      displayName: 'new name 2',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    }),
  });
  expect(mockSocketApi.post).toBeCalledTimes(1);
});

it('returns error if not authenticated', async () => {
  const response = await executeOperation({
    displayName: 'random',
  });

  expectGraphQLResponseError(response, GraphQLErrorCode.UNAUTHENTICATED);
});
