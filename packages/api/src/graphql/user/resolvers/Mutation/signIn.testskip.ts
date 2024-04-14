import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep, mockReset } from 'vitest-mock-extended';

import { verifyCredentialToken } from '../../../../auth/google/__mocks__/oauth2';
import { GraphQLResolversContext } from '../../../context';
import { SessionDocument } from '../../../../mongoose/models/session';
import { UserDocument } from '../../../../mongoose/models/user';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import { mockResolver } from '../../../../test/helpers/mock-resolver';
import CookiesContext from '../../../cookies-context';
import { AuthProvider } from '../../../types.generated';

import { signIn } from './signIn';


vi.mock('../../../../auth/google/oauth2');

const mockedContext = vi.mocked(
  mockDeep<GraphQLResolversContext>({
    response: {
      multiValueHeaders: {},
    },
  }),
  true
);

beforeEach(() => {
  return;
  mockReset(mockedContext);
  mockedContext.response.multiValueHeaders = {};
});

describe.skip('directly', () => {
  return;
  it('uses User._id when creating a new session', async () => {
    const userId = faker.database.mongodbObjectId();

    const mockedNewUser = mock<UserDocument>({
      _id: userId,
    });
    // new model.User()
    mockedContext.mongoose.model.User.mockReturnValueOnce(mockedNewUser);
    mockedNewUser.save.mockReturnThis();

    const mockedNewSession = mock<SessionDocument>();
    mockedNewSession.save.mockReturnThis();
    // new model.Session()
    mockedContext.mongoose.model.Session.mockImplementationOnce((args) =>
      Object.assign(mockedNewSession, args)
    );

    const authProviderUser = {
      id: String(faker.number.int()),
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const result = await mockResolver(signIn)(
      {},
      {
        input: {
          provider: AuthProvider.GOOGLE,
          credentials: {
            token: faker.string.numeric(20),
          },
        },
      },
      mockedContext
    );

    expect(mockedNewUser._id).toStrictEqual(userId);
    expect(mockedNewSession.userId).toStrictEqual(userId);

    assert(result != null);
    expect(result.authProviderUser.id).toStrictEqual(authProviderUser.id);
  });

  it('signs in, sets correct session index and appends it to 2 existing session', async () => {
    const newCookieId = faker.string.nanoid();

    const mockedNewUser = mock<UserDocument>();
    // new model.User()
    mockedContext.mongoose.model.User.mockReturnValueOnce(mockedNewUser);
    mockedNewUser.save.mockReturnThis();

    const mockedNewSession = mock<SessionDocument>({
      cookieId: newCookieId,
    });
    mockedNewSession.save.mockReturnThis();
    // new model.Session()
    mockedContext.mongoose.model.Session.mockImplementationOnce((args) =>
      Object.assign(mockedNewSession, args)
    );

    const authProviderUser = {
      id: String(faker.number.int()),
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const result = await mockResolver(signIn)(
      {},
      {
        input: {
          provider: AuthProvider.GOOGLE,
          credentials: {
            token: faker.string.alphanumeric(),
          },
        },
      },
      mockedContext
    );

    expect(result).containSubset({
      authProviderUser: {
        id: authProviderUser.id,
        email: authProviderUser.email,
      },
    });
  });

  it('signs in with an existing google account, has no existing session', async () => {
    const signInToken = faker.string.alphanumeric();
    const cookieId = faker.string.nanoid();
    const displayName = faker.person.firstName();
    const publicUserId = faker.string.nanoid();

    const mockedExistingUser = mockDeep<UserDocument>({
      publicId: publicUserId,
      profile: {
        displayName,
      },
    });

    mockedContext.mongoose.model.User.findOne.mockResolvedValueOnce(mockedExistingUser);

    const mockedSession = mock<SessionDocument>({
      cookieId,
    });
    mockedSession.save.mockReturnThis();
    // new model.Session()
    mockedContext.mongoose.model.Session.mockImplementationOnce((args) =>
      Object.assign(mockedSession, args)
    );

    const authProviderUser = {
      id: String(faker.number.int()),
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const result = await mockResolver(signIn)(
      {},
      {
        input: {
          provider: AuthProvider.GOOGLE,
          credentials: {
            token: signInToken,
          },
        },
      },
      {
        ...mockedContext,
        cookies: new CookiesContext({ sessions: {} }),
      }
    );

    expect(result).toStrictEqual({
      authProviderUser: {
        id: authProviderUser.id,
        email: authProviderUser.email,
      },
      user: {
        id: publicUserId,
        profile: {
          displayName,
        },
      },
    });

    expect({ ...mockedContext.response.multiValueHeaders }).toStrictEqual({
      'Set-Cookie': [
        `Sessions=${publicUserId}:${cookieId}; HttpOnly; SameSite=Strict; Secure`,
      ],
    });
  });
});

describe.skip('apollo server', () => {
  return;
  const query = `#graphql
    mutation SignIn($input: SignInInput!) {
      signIn(input: $input) {
        user {
          id
          profile {
            displayName
          }
        }
      }
    }
  `;

  it('signs in with an existing google account, has no existing session', async () => {
    const signInToken = faker.string.alphanumeric();
    const cookieId = faker.string.nanoid();
    const displayName = faker.person.firstName();
    const userPublicId = faker.string.nanoid();

    const mockedExistingUser = mockDeep<UserDocument>({
      publicId: userPublicId,
      profile: {
        displayName,
      },
    });

    mockedContext.mongoose.model.User.findOne.mockResolvedValueOnce(mockedExistingUser);

    const mockedSession = mock<SessionDocument>({
      cookieId,
    });
    mockedSession.save.mockReturnThis();
    // new model.Session()
    mockedContext.mongoose.model.Session.mockImplementationOnce((args) =>
      Object.assign(mockedSession, args)
    );

    const authProviderUser = {
      id: String(faker.number.int()),
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const response = await apolloServer.executeOperation(
      {
        query,
        variables: {
          input: {
            provider: 'GOOGLE',
            credentials: {
              token: signInToken,
            },
          },
        },
      },
      {
        contextValue: {
          ...mockedContext,
          cookies: new CookiesContext({ sessions: {} }),
        },
      }
    );

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      signIn: {
        user: {
          id: userPublicId,
          profile: {
            displayName,
          },
        },
      },
    });
  });
});
