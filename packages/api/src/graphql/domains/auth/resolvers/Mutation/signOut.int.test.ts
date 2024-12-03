import { faker } from '@faker-js/faker';
import { afterEach, beforeAll, beforeEach, expect, it, MockInstance, vi } from 'vitest';
import * as delete_session_with_cookies from '../../../../../services/auth/delete-session-with-cookies';
import * as delete_all_session_in_cookies from '../../../../../services/auth/delete-all-sessions-in-cookies';
import { SignOutInput, SignOutPayload } from '../../../types.generated';
import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
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
import { Cookies } from '../../../../../services/http/cookies';

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

let spyDeleteSessionWithCookies: MockInstance<
  (params: delete_session_with_cookies.DeleteSessionWithCookiesParams) => Promise<void>
>;
let spyDeleteAllSessionsInCookies: MockInstance<
  (
    params: delete_all_session_in_cookies.DeleteAllSessionsInCookiesParams
  ) => Promise<void>
>;

let user: DBUserSchema;
let session: DBSessionSchema;

beforeAll(() => {
  spyDeleteSessionWithCookies = vi.spyOn(
    delete_session_with_cookies,
    'deleteSessionWithCookies'
  );
  spyDeleteAllSessionsInCookies = vi.spyOn(
    delete_all_session_in_cookies,
    'deleteAllSessionsInCookies'
  );
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

  expect(spyDeleteSessionWithCookies).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: user._id,
      cookieId: session.cookieId,
      cookies,
    })
  );
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

  expect(spyDeleteAllSessionsInCookies).toHaveBeenCalledWith(
    expect.objectContaining({
      cookies,
    })
  );
});
