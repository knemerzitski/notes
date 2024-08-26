/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { afterEach, beforeAll, beforeEach, expect, it, MockInstance, vi } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  UpdateSignedInUserDisplayNameInput,
  UpdateSignedInUserDisplayNamePayload,
} from '../../../types.generated';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
  createMockedPublisher,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../__test__/helpers/graphql/response';
import * as serviceUser from '../../../../services/user/user';
import { UpdateResult } from 'mongodb';
import { signedInUserTopic } from '../Subscription/signedInUserEvents';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { objectIdToStr } from '../../../../services/utils/objectid';
import { QueryableUserLoader } from '../../../../mongodb/loaders/queryable-user-loader';

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

let user: UserSchema;

let spyUpdateDisplayName: MockInstance<
  [serviceUser.UpdateDisplayNameParams],
  Promise<UpdateResult<UserSchema>>
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
    prime: {
      loader: expect.any(QueryableUserLoader),
    },
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
