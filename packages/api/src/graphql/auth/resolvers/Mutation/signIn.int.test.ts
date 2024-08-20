import { faker } from '@faker-js/faker';
import {
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
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
import { SessionSchema } from '../../../../mongodb/schema/session/session';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { SignInInput, SignInPayload } from '../../../types.generated';
import { expectGraphQLResponseData } from '../../../../__test__/helpers/graphql/response';
import { verifyCredentialToken } from '../../../../services/auth/google/__mocks__/oauth2';
import * as serviceSession from '../../../../services/session/session';
import * as serviceUser from '../../../../services/user/user';
import { SessionDuration } from '../../../../services/session/duration';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';

vi.mock('../../../../services/auth/google/oauth2');

interface Variables {
  input: SignInInput;
}

const MUTATION = `#graphql
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      ... on SignInPayload {
        signedInUser {
          id
          publicProfile {
            displayName
          }
        }
        authProviderUser {
          id
          email
        }
        availableUserIds
      }
      ... on SignInFailedError {
        message
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

beforeAll(() => {
  spyInsertNewSession = vi.spyOn(serviceSession, 'insertNewSession');
  spyInsertNewUserWithGoogleUser = vi.spyOn(serviceUser, 'insertNewUserWithGoogleUser');
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

describe('new user', () => {
  beforeEach(async () => {
    faker.seed(897);
    await resetDatabase();
    verifyCredentialToken.mockClear();

    mongoCollectionStats.mockClear();
  });

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

    expect(data).toEqual({
      signIn: {
        signedInUser: {
          id: expect.any(String),
          publicProfile: { displayName: authProviderUser.name },
        },
        authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
        availableUserIds: [expect.any(String)],
      },
    });

    expect(verifyCredentialToken).toHaveBeenCalledWith('irrelevant');

    // New ser was inserted to db
    expect(spyInsertNewUserWithGoogleUser).toHaveBeenCalledWith({
      id: authProviderUser.id,
      displayName: authProviderUser.name,
      collection: mongoCollections.users,
    });

    const newUserResult = spyInsertNewUserWithGoogleUser.mock.results[0];
    assert(newUserResult?.type == 'return');
    const newUser = await newUserResult.value;

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
});

// TODO existing user sign in
// TODO sign in with already signed in
