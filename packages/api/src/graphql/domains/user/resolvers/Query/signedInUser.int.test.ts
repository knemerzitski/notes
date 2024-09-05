import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__test__/helpers/graphql/response';
import {
  resetDatabase,
  mongoCollectionStats,
} from '../../../../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/user';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { SignedInUser } from '../../../types.generated';
import { logAll } from '../../../../../__test__/helpers/log-all';

const QUERY = `#graphql
query  {
  signedInUser {
    id
    public {
      profile {
        displayName
      }
    }
  }
}
`;

let user: DBUserSchema;

beforeAll(async () => {
  faker.seed(987786);
  await resetDatabase();

  user = fakeUserPopulateQueue();

  await populateExecuteAll();
});

let contextValue: ReturnType<typeof createGraphQLResolversContext>;

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

async function executeOperation(
  options?: CreateGraphQLResolversContextOptions,
  query: string = QUERY
) {
  contextValue = createGraphQLResolversContext(options);

  return await apolloServer.executeOperation<{
    signedInUser: SignedInUser;
  }>(
    {
      query,
    },
    {
      contextValue,
    }
  );
}

it('returns authenticated user', async () => {
  const response = await executeOperation({ user });

  const data = expectGraphQLResponseData(response);

  logAll(data);

  expect(data).toEqual({
    signedInUser: {
      id: objectIdToStr(user._id),
      public: {
        profile: {
          displayName: user.profile.displayName,
        },
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
});

it('returns error if not authenticated', async () => {
  const response = await executeOperation();

  expectGraphQLResponseError(response, GraphQLErrorCode.UNAUTHENTICATED);
});
