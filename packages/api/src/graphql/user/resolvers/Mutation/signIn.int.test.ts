/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyCredentialToken } from '../../../../auth/google/__mocks__/oauth2';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import { AuthProvider, SignInInput, SignInPayload } from '../../../types.generated';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';
import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import { CollectionName } from '../../../../mongodb/collections';
import { ObjectId } from 'mongodb';
import { SessionSchema } from '../../../../mongodb/schema/session/sessions';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  createUser,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';

vi.mock('../../../../auth/google/oauth2');

const MUTATION = `#graphql
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    user {
      id
      profile {
        displayName
      }
    }
    authProviderUser {
      id
      email
    }
  }
}
`;

describe('new user', () => {
  beforeEach(async () => {
    faker.seed(897);
    await resetDatabase();
  });

  it('creates new user and session on first sign in', async () => {
    const contextValue = createGraphQLResolversContext();

    const authProviderUser = {
      id: String(faker.number.int()),
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            credentials: {
              token: 'irrelevant',
            },
            provider: AuthProvider.GOOGLE,
          } as SignInInput,
        },
      },
      {
        contextValue,
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult as {
      data: { signIn: SignInPayload };
      errors: unknown;
    };
    expect(errors).toBeUndefined();

    // Valid response
    expect(data).toEqual({
      signIn: {
        user: { id: expect.any(String), profile: { displayName: authProviderUser.name } },
        authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      },
    });

    const userId = ObjectId.createFromBase64(String(data.signIn.user.id));

    // Created User document
    expect(
      await mongoCollections[CollectionName.Users].findOne({
        _id: userId,
      })
    ).containSubset({
      profile: {
        displayName: data.signIn.user.profile.displayName,
      },
    });

    // Sets valid cookie
    const session = await mongoCollections[CollectionName.Sessions].findOne<
      Pick<SessionSchema, 'cookieId'>
    >(
      {
        userId,
      },
      {
        projection: {
          cookieId: 1,
        },
      }
    );
    assert(session != null);

    expect(contextValue.response.multiValueHeaders).toEqual({
      'Set-Cookie': [
        `Sessions=${data.signIn.user.id}:${session.cookieId}; HttpOnly; SameSite=Strict`,
      ],
    });
  });
});

describe('existing user user', () => {
  let user: UserSchema;

  beforeEach(async () => {
    faker.seed(897);
    await resetDatabase();

    user = createUser();
    await populateWithCreatedData();
  });

  it('uses existing user and creates new session', async () => {
    const contextValue = createGraphQLResolversContext();

    const googleUserId = user.thirdParty?.google?.id;
    assert(googleUserId != null);
    const authProviderUser = {
      id: googleUserId,
      email: faker.person.lastName() + '@email.com',
      name: faker.person.firstName(),
    };
    verifyCredentialToken.mockResolvedValueOnce(authProviderUser);

    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            credentials: {
              token: 'irrelevant',
            },
            provider: AuthProvider.GOOGLE,
          } as SignInInput,
        },
      },
      {
        contextValue,
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult as {
      data: { signIn: SignInPayload };
      errors: unknown;
    };
    expect(errors).toBeUndefined();

    expect(data).toEqual({
      signIn: {
        user: { id: expect.any(String), profile: user.profile },
        authProviderUser: { id: authProviderUser.id, email: authProviderUser.email },
      },
    });
  });
});