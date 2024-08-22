import { faker } from '@faker-js/faker';
import { afterEach, beforeAll, beforeEach, expect, it, MockInstance, vi } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { SignOutInput, SignOutPayload } from '../../../types.generated';
import { fakeSessionPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/session';
import { SessionSchema } from '../../../../mongodb/schema/session/session';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { expectGraphQLResponseData } from '../../../../__test__/helpers/graphql/response';
import { objectIdToStr } from '../../../../services/utils/objectid';
import * as serviceAuth from '../../../../services/auth/auth';
import { Cookies } from '../../../../services/http/cookies';

interface Variables {
  input: SignOutInput;
}

const MUTATION = `#graphql
  mutation SignOut($input: SignOutInput!) {
    signOut(input: $input) {
      signedOutUserIds
      availableUserIds
    }
  }
`;

let spyDeleteSessionWithCookies: MockInstance<[serviceAuth.DeleteSessionParams], Promise<void>>;
let spyDeleteAllSessionsInCookies: MockInstance<
  [serviceAuth.DeleteAllSessionsInCookiesParams],
  Promise<void>
>;

let user: UserSchema;
let session: SessionSchema;

beforeAll(() => {
  spyDeleteSessionWithCookies = vi.spyOn(serviceAuth, 'deleteSessionWithCookies');
  spyDeleteAllSessionsInCookies = vi.spyOn(serviceAuth, 'deleteAllSessionsInCookies');
});

beforeEach(async () => {
  faker.seed(7657);
  await resetDatabase();

  user = fakeUserPopulateQueue();

  session = fakeSessionPopulateQueue({
    override: {
      userId: user._id,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

afterEach(() => {
  spyDeleteSessionWithCookies.mockClear();
  spyDeleteAllSessionsInCookies.mockClear();
});

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      signOut: SignOutPayload;
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

it('signs out specific user', async () => {
  const cookies = new Cookies();
  cookies.setSession(user._id, session.cookieId);

  const response = await executeOperation(
    {
      userId: user._id,
    },
    {
      override: {
        cookies,
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signOut: {
      signedOutUserIds: [objectIdToStr(user._id)],
      availableUserIds: [],
    },
  });

  expect(spyDeleteSessionWithCookies).toHaveBeenCalledWith({
    userId: user._id,
    cookieId: session.cookieId,
    cookies,
    collection: mongoCollections.sessions,
  });
});

it('signs out all users', async () => {
  const cookies = new Cookies();
  cookies.setSession(user._id, session.cookieId);

  const response = await executeOperation(
    {
      allUsers: true,
      userId: user._id, // is ignored
    },
    {
      override: {
        cookies,
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signOut: {
      signedOutUserIds: [objectIdToStr(user._id)],
      availableUserIds: [],
    },
  });

  expect(spyDeleteAllSessionsInCookies).toHaveBeenCalledWith({
    cookies,
    collection: mongoCollections.sessions,
  });
});
