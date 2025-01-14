import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__tests__/helpers/graphql/response';
import {
  resetDatabase,
  mongoCollectionStats,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/session';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBSessionSchema } from '../../../../../mongodb/schema/session';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { SignedInUser } from '../../../types.generated';

const QUERY = `#graphql
query($id: ObjectID!)  {
  signedInUser(by: {id: $id}) {
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
let session: DBSessionSchema;

beforeAll(async () => {
  faker.seed(987786);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  session = fakeSessionPopulateQueue({
    override: {
      userId: user._id,
    },
  });

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
      variables: {
        id: options?.user?._id,
      },
    },
    {
      contextValue,
    }
  );
}

it('returns authenticated user', async () => {
  const response = await executeOperation({ user, session });

  const data = expectGraphQLResponseData(response);

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

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);
});

it('returns error if not authenticated', async () => {
  const response = await executeOperation({ user });

  expectGraphQLResponseError(response, GraphQLErrorCode.UNAUTHENTICATED);
});
