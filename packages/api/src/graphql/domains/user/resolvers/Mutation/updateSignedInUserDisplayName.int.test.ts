/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import { faker } from '@faker-js/faker';
import { ObjectId, UpdateResult } from 'mongodb';
import { MockInstance, beforeAll, vi, afterEach, beforeEach, it, expect } from 'vitest';

import { GraphQLErrorCode } from '../../../../../../../api-app-shared/src/graphql/error-codes';
import { Subscription } from '../../../../../../../lambda-graphql/src/dynamodb/models/subscription';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
  mockSubscriptionsModel,
  createMockedPublisher,
  mockSocketApi,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__tests__/helpers/graphql/response';
import { resetDatabase } from '../../../../../__tests__/helpers/mongodb/instance';
import { mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/mongo-collection-stats';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import * as update_display_name from '../../../../../mongodb/models/user/update-display-name';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import {
  UpdateSignedInUserDisplayNameInput,
  UpdateSignedInUserDisplayNamePayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../Subscription/signedInUserEvents';

interface Variables {
  input: Omit<UpdateSignedInUserDisplayNameInput, 'authUser'>;
}

const MUTATION = `#graphql
  mutation($input: UpdateSignedInUserDisplayNameInput!){
    updateSignedInUserDisplayName(input: $input) {
      displayName
      signedInUser {
        id
        profile {
          displayName
        }
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on UpdateSignedInUserDisplayNamePayload {
          displayName
          signedInUser {
            id
            profile {
              displayName
            }
          }
        }
      }
    }
  }
`;

let user: DBUserSchema;

let spyUpdateDisplayName: MockInstance<
  (
    params: update_display_name.UpdateDisplayNameParams
  ) => Promise<UpdateResult<DBUserSchema>>
>;

beforeAll(() => {
  spyUpdateDisplayName = vi.spyOn(update_display_name, 'updateDisplayName');
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
    {
      input: UpdateSignedInUserDisplayNameInput;
    }
  >(
    {
      query,
      variables: {
        input: {
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          displayName: input.displayName,
        },
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
        profile: {
          displayName: 'new name',
        },
      },
    },
  });

  expect(spyUpdateDisplayName).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: user._id,
      displayName: 'new name',
    })
  );

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
});

it('publishes displayName payload', async () => {
  mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
    {
      subscription: {
        query: SUBSCRIPTION,
        variables: {
          input: {
            authUser: {
              id: user._id,
            },
          },
        } as any,
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
                  profile: {
                    displayName: 'new name 2',
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
