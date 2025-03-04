/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';
import {
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import { mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/mongo-collection-stats';
import {
  resetDatabase,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBSessionSchema } from '../../../../../mongodb/schema/session';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { verifyCredentialToken } from '../../../../../services/auth/google/__mocks__/oauth2';
import { Cookies } from '../../../../../services/http/cookies';
import { SessionDuration } from '../../../../../services/session/duration';
import * as insert_session from '../../../../../services/session/insert-session';
import * as insert_user_with_google_user from '../../../../../services/user/insert-user-with-google-user';
import { SignInInput, SignInPayload } from '../../../types.generated';

vi.mock('../../../../../services/auth/google/oauth2');

interface Variables {
  input: SignInInput;
}

const MUTATION = `#graphql
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      __typename
      ... on SignInResult {
        signedInUser {
          id
          profile {
            displayName
          }
        }
        availableUsers {
          id
        }
      }
      ... on JustSignedInResult {
        authProviderUser {
          id
          email
        }
      }
    }
  }
`;

let spyInsertSession: MockInstance<
  (_params: insert_session.InsertSessionParams) => Promise<DBSessionSchema>
>;

let spyInsertUserWithGoogleUser: MockInstance<
  (
    params: Parameters<typeof insert_user_with_google_user.insertUserWithGoogleUser>[0]
  ) => Promise<DBUserSchema>
>;

let user: DBUserSchema;

beforeAll(() => {
  spyInsertSession = vi.spyOn(insert_session, 'insertSession');
  spyInsertUserWithGoogleUser = vi.spyOn(
    insert_user_with_google_user,
    'insertUserWithGoogleUser'
  );
});

beforeEach(async () => {
  faker.seed(7657);
  await resetDatabase();

  user = fakeUserPopulateQueue();

  await populateExecuteAll();

  verifyCredentialToken.mockClear();
  mongoCollectionStats.mockClear();
});

afterEach(() => {
  spyInsertSession.mockClear();
  spyInsertUserWithGoogleUser.mockClear();
});

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      signIn: SignInPayload;
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

it('creates new user and session on first sign in with google', async () => {
  const authProviderUser = {
    id: '12345',
    email: 'last.first@email.com',
    name: 'first',
  };
  verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

  const multiValueHeaders: Record<string, (string | number | boolean)[]> = {};

  const cookies = new Cookies();

  const response = await executeOperation(
    {
      auth: {
        google: {
          token: 'irrelevant',
        },
      },
    },
    {
      cookies,
      override: {
        response: {
          multiValueHeaders,
        },
      },
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(verifyCredentialToken).toHaveBeenCalledWith('irrelevant');

  // New user was inserted to db
  expect(spyInsertUserWithGoogleUser).toHaveBeenCalledWith(
    expect.objectContaining({
      id: authProviderUser.id,
      displayName: authProviderUser.name,
    })
  );

  const newUserResult = spyInsertUserWithGoogleUser.mock.results[0];
  assert(newUserResult?.type == 'return');
  const newUser = await newUserResult.value;

  expect(data).toEqual({
    signIn: {
      __typename: 'JustSignedInResult',
      signedInUser: {
        id: objectIdToStr(newUser._id),
        profile: { displayName: authProviderUser.name },
      },
      authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      availableUsers: [{ id: objectIdToStr(newUser._id) }],
    },
  });

  // New session was inserted to db
  expect(spyInsertSession).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: newUser._id,
      duration: expect.any(SessionDuration),
    })
  );

  const newSessionResult = spyInsertSession.mock.results[0];
  assert(newSessionResult?.type == 'return');
  const newSession = await newSessionResult.value;

  expect(cookies.getMultiValueHeadersSetCookies()).toStrictEqual([
    `Sessions=${objectIdToStr(newSession.userId)}:${
      newSession.cookieId
    }; HttpOnly; SameSite=Strict; Path=/`,
  ]);

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);
});

it('signs in with existing user by creating new session', async () => {
  const authProviderUser = {
    id: user.thirdParty!.google!.id!,
    email: 'last.first@email.com',
    name: 'first',
  };
  verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

  const response = await executeOperation({
    auth: {
      google: {
        token: 'irrelevant',
      },
    },
  });

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signIn: {
      __typename: 'JustSignedInResult',
      signedInUser: {
        id: objectIdToStr(user._id),
        profile: { displayName: user.profile.displayName },
      },
      authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      availableUsers: [{ id: objectIdToStr(user._id) }],
    },
  });

  // New user creation not called
  expect(spyInsertUserWithGoogleUser).not.toHaveBeenCalled();

  // New session was inserted to db
  expect(spyInsertSession).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: user._id,
      duration: expect.any(SessionDuration),
    })
  );

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);
});

it('returns already signed in result with existing auth', async () => {
  const authProviderUser = {
    id: user.thirdParty!.google!.id!,
    email: 'last.first@email.com',
    name: 'first',
  };
  verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

  const response = await executeOperation(
    {
      auth: {
        google: {
          token: 'irrelevant',
        },
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signIn: {
      __typename: 'AlreadySignedInResult',
      signedInUser: {
        id: objectIdToStr(user._id),
        profile: { displayName: user.profile.displayName },
      },
      availableUsers: [
        {
          id: objectIdToStr(user._id),
        },
      ],
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  expect(spyInsertUserWithGoogleUser).not.toHaveBeenCalled();

  expect(spyInsertSession).not.toHaveBeenCalled();
});

it('signs in new user while already authenticated with another user', async () => {
  const authProviderUser = {
    id: user.thirdParty!.google!.id! + 'new',
    email: 'aaaaa@email.com',
    name: 'second',
  };
  verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

  const response = await executeOperation(
    {
      auth: {
        google: {
          token: 'irrelevant',
        },
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signIn: {
      __typename: 'JustSignedInResult',
      authProviderUser: {
        id: authProviderUser.id,
        email: authProviderUser.email,
      },
      signedInUser: {
        id: expect.any(String),
        profile: { displayName: 'second' },
      },
      availableUsers: [{ id: objectIdToStr(user._id) }, { id: expect.any(String) }],
    },
  });
});
