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

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { SessionSchema } from '../../../../mongodb/schema/session';
import { UserSchema } from '../../../../mongodb/schema/user';
import { SignInInput, SignInPayload } from '../../../types.generated';
import { expectGraphQLResponseData } from '../../../../__test__/helpers/graphql/response';
import { verifyCredentialToken } from '../../../../services/auth/google/__mocks__/oauth2';
import * as serviceSession from '../../../../services/session/session';
import * as serviceUser from '../../../../services/user/user';
import { SessionDuration } from '../../../../services/session/duration';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { objectIdToStr } from '../../../../services/utils/objectid';

vi.mock('../../../../services/auth/google/oauth2');

interface Variables {
  input: SignInInput;
}

const MUTATION = `#graphql
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      ... on SignInResult {
        signedInUser {
          id
          public {
            profile {
              displayName
            }
          }
        }
        availableUserIds
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

let spyInsertNewSession: MockInstance<
  [serviceSession.InsertNewSessionParams],
  Promise<SessionSchema>
>;
let spyInsertNewUserWithGoogleUser: MockInstance<
  [serviceUser.InsertNewUserWithGoogleUserParams],
  Promise<UserSchema>
>;

let user: UserSchema;

beforeAll(() => {
  spyInsertNewSession = vi.spyOn(serviceSession, 'insertNewSession');
  spyInsertNewUserWithGoogleUser = vi.spyOn(serviceUser, 'insertNewUserWithGoogleUser');
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
  spyInsertNewSession.mockClear();
  spyInsertNewUserWithGoogleUser.mockClear();
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

  const response = await executeOperation(
    {
      auth: {
        token: 'irrelevant',
      },
    },
    {
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
  expect(spyInsertNewUserWithGoogleUser).toHaveBeenCalledWith({
    id: authProviderUser.id,
    displayName: authProviderUser.name,
    collection: mongoCollections.users,
  });

  const newUserResult = spyInsertNewUserWithGoogleUser.mock.results[0];
  assert(newUserResult?.type == 'return');
  const newUser = await newUserResult.value;

  expect(data).toEqual({
    signIn: {
      signedInUser: {
        id: objectIdToStr(newUser._id),
        public: {
          profile: { displayName: authProviderUser.name },
        },
      },
      authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      availableUserIds: [objectIdToStr(newUser._id)],
    },
  });

  // New session was inserted to db
  expect(spyInsertNewSession).toHaveBeenCalledWith({
    userId: newUser._id,
    duration: expect.any(SessionDuration),
    collection: mongoCollections.sessions,
  });

  const newSessionResult = spyInsertNewSession.mock.results[0];
  assert(newSessionResult?.type == 'return');
  const newSession = await newSessionResult.value;

  expect(multiValueHeaders).toEqual({
    'Set-Cookie': [
      `Sessions=${objectIdToStr(newSession.userId)}:${
        newSession.cookieId
      }; HttpOnly; SameSite=Strict; Path=/`,
    ],
  });

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
      token: 'irrelevant',
    },
  });

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signIn: {
      signedInUser: {
        id: objectIdToStr(user._id),
        public: {
          profile: { displayName: user.profile.displayName },
        },
      },
      authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      availableUserIds: [objectIdToStr(user._id)],
    },
  });

  // New user creation not called
  expect(spyInsertNewUserWithGoogleUser).not.toHaveBeenCalled();

  // New session was inserted to db
  expect(spyInsertNewSession).toHaveBeenCalledWith({
    userId: user._id,
    duration: expect.any(SessionDuration),
    collection: mongoCollections.sessions,
  });

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
        token: 'irrelevant',
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signIn: {
      signedInUser: {
        id: objectIdToStr(user._id),
        public: {
          profile: { displayName: user.profile.displayName },
        },
      },
      availableUserIds: [objectIdToStr(user._id)],
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  expect(spyInsertNewUserWithGoogleUser).not.toHaveBeenCalled();

  expect(spyInsertNewSession).not.toHaveBeenCalled();
});
