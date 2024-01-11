import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep, mockReset } from 'vitest-mock-extended';

import { GraphQLResolversContext } from '../../../../graphql/context';
import { SessionDocument } from '../../../../mongoose/models/session';
import { UserDocument } from '../../../../mongoose/models/user';
import { apolloServer } from '../../../../tests/helpers/apollo-server';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import { getSessionUserFromHeaders } from '../../__mocks__/parse-cookies';
import { CookieSessionUser } from '../../parse-cookies';

import { signIn } from './signIn';

vi.mock('../../parse-cookies');

const expireAt = faker.date.soon({ days: 7 });

const mockedContext = vi.mocked(
  mockDeep<GraphQLResolversContext>({
    response: {
      multiValueHeaders: {},
    },
    session: {
      newExpireAt: () => expireAt,
    },
  }),
  true
);

beforeEach(() => {
  mockReset(mockedContext);
  mockedContext.response.multiValueHeaders = {};
});

describe('directly', () => {
  it(`throws error if token isn't provided when signing in with Google`, async () => {
    await expect(async () => {
      await mockResolver(signIn)(
        {},
        {
          input: {
            provider: 'GOOGLE',
            credentials: {},
          },
        },
        mockedContext
      );
    }).rejects.toThrowError();
  });

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

    await mockResolver(signIn)(
      {},
      {
        input: {
          provider: 'GOOGLE',
          credentials: {
            // TODO right now auth is not implemented so any token will work
            // Later must mock google jwt verification
            token: faker.string.numeric(20),
          },
        },
      },
      mockedContext
    );

    expect(mockedNewUser._id).toStrictEqual(userId);
    expect(mockedNewSession.userId).toStrictEqual(userId);
  });

  it('signs in, sets correct session index and appends it to 2 existing session', async () => {
    const existingSessions = [faker.string.nanoid(), faker.string.nanoid()];

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

    getSessionUserFromHeaders.mockImplementationOnce(async () =>
      Promise.resolve(
        mock<CookieSessionUser>({
          cookie: {
            index: 0,
            sessions: existingSessions,
          },
        })
      )
    );

    const result = await mockResolver(signIn)(
      {},
      {
        input: {
          provider: 'GOOGLE',
          credentials: {
            // TODO right now auth is not implemented so any token will work
            // Later must mock google jwt verificatmockedExistingUserion
            token: faker.string.alphanumeric(),
          },
        },
      },
      mockedContext
    );

    expect(result).containSubset({
      sessionIndex: 2,
    });

    expect({ ...mockedContext.response.multiValueHeaders }).toStrictEqual({
      'Set-Cookie': [
        `Sessions=${existingSessions
          .concat([newCookieId])
          .join(',')}; HttpOnly; SameSite=Strict; Secure`,
        'CurrentSessionIndex=2; HttpOnly; SameSite=Strict; Secure',
      ],
    });
  });

  it('signs in with an existing google account, has no existing session', async () => {
    const signInToken = faker.string.alphanumeric();
    const cookieId = faker.string.nanoid();
    const displayName = faker.person.firstName();

    const mockedExistingUser = mockDeep<UserDocument>({
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

    const result = await mockResolver(signIn)(
      {},
      {
        input: {
          provider: 'GOOGLE',
          credentials: {
            // TODO right now auth is not implemented so any token will work
            // Later must mock google jwt verification
            token: signInToken,
          },
        },
      },
      mockedContext
    );

    expect(result).toStrictEqual({
      sessionIndex: 0,
      userInfo: {
        profile: {
          displayName,
        },
      },
    });

    expect({ ...mockedContext.response.multiValueHeaders }).toStrictEqual({
      'Set-Cookie': [
        `Sessions=${cookieId}; HttpOnly; SameSite=Strict; Secure`,
        'CurrentSessionIndex=0; HttpOnly; SameSite=Strict; Secure',
      ],
    });
  });
});

describe('apollo server', () => {
  const query = `#graphql
    mutation SignIn($input: SignInInput!) {
      signIn(input: $input) {
        sessionIndex
        userInfo {
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

    const mockedExistingUser = mockDeep<UserDocument>({
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

    const response = await apolloServer.executeOperation(
      {
        query,
        variables: {
          input: {
            provider: 'GOOGLE',
            credentials: {
              // TODO right now auth is not implemented so any token will work
              // Later must mock google jwt verification
              token: signInToken,
            },
          },
        },
      },
      {
        contextValue: mockedContext,
      }
    );

    assert(response.body.kind === 'single');
    expect(response.body.singleResult.data).toEqual({
      signIn: {
        sessionIndex: 0,
        userInfo: {
          profile: {
            displayName,
          },
        },
      },
    });
  });
});
