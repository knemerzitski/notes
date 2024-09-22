// must call an endpoint with normal request???

import { beforeEach, expect, it, vi } from 'vitest';
import {
  SignInInput,
  SignInPayload,
  SignOutInput,
  SignOutPayload,
  UpdateSignedInUserDisplayNameInput,
  UpdateSignedInUserDisplayNamePayload,
} from '../../graphql/domains/types.generated';
import { mongoCollections, resetDatabase } from '../helpers/mongodb/mongodb';
import { faker } from '@faker-js/faker';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { strToObjectId } from '../../mongodb/utils/objectid';
import { HttpSession } from '../helpers/e2e/http-session';
import { fetchGraphQL } from '../helpers/e2e/fetch-graphql';
import { createGraphQLWebSocket } from '../helpers/e2e/websocket';

beforeEach(async () => {
  faker.seed(76572);
  await resetDatabase();
});

it('creates new user, updates displayName and publishes it to websocket', async () => {
  const httpSession = new HttpSession();
  const fetchFn = httpSession.fetch.bind(httpSession);

  // Sign in first time
  const { result: signInResult } = await fetchGraphQL<
    { signIn: SignInPayload },
    { input: SignInInput }
  >(
    {
      query: `#graphql
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
            }
          }
        }
      `,
      variables: {
        input: {
          auth: {
            token: JSON.stringify({
              id: '1',
              name: 'Foo Bar',
              email: 'foo.bar@localhost.com',
            }),
          },
        },
      },
    },
    fetchFn
  );
  const userId = signInResult.data?.signIn.signedInUser.id;
  expect(userId, JSON.stringify(signInResult.errors, null, 2)).toBeDefined();
  const userIdStr = String(userId);

  // Set user for subsequent requests
  httpSession.setHeader(CustomHeaderName.USER_ID, userIdStr);

  // Start WebSocket subscription
  const graphQLWs = await createGraphQLWebSocket({
    headers: httpSession.getHeaders(),
  });
  const wsNextUpdateDisplayNameFn = vi.fn();
  graphQLWs.subscribe(
    {
      query: `#graphql
      subscription UserEvents {
        signedInUserEvents {
          mutations {
            ... on UpdateSignedInUserDisplayNamePayload {
              displayName
            }
          }
        }
      }
    `,
    },
    wsNextUpdateDisplayNameFn
  );

  // Update displayName
  const { result: updateDisplayNameResult } = await fetchGraphQL<
    { updateSignedInUserDisplayName: UpdateSignedInUserDisplayNamePayload },
    { input: UpdateSignedInUserDisplayNameInput }
  >(
    {
      query: `#graphql
        mutation UpdateDisplayName($input: UpdateSignedInUserDisplayNameInput!) {
          updateSignedInUserDisplayName(input: $input) {
            displayName
          }
        }
      `,
      variables: {
        input: {
          displayName: 'Bar Name',
        },
      },
    },
    fetchFn
  );

  expect(
    updateDisplayNameResult.data?.updateSignedInUserDisplayName.displayName
  ).toStrictEqual('Bar Name');
  expect(wsNextUpdateDisplayNameFn).toHaveBeenCalledWith({
    id: expect.any(String),
    type: 'next',
    payload: {
      data: {
        signedInUserEvents: { mutations: [{ displayName: 'Bar Name' }] },
      },
    },
  });

  // Sign out
  const { result: signOutResult } = await fetchGraphQL<
    { signOut: SignOutPayload },
    { input: SignOutInput }
  >(
    {
      query: `#graphql
        mutation SignOut {
          signOut {
            availableUserIds
          }
        }
      `,
    },
    fetchFn
  );
  expect(signOutResult.data?.signOut.availableUserIds).toHaveLength(0);

  // Validate database actually has user with changed displayName
  const dbUser = await mongoCollections.users.findOne({
    _id: strToObjectId(userIdStr),
  });

  expect(dbUser).toEqual(
    expect.objectContaining({
      profile: expect.objectContaining({
        displayName: 'Bar Name',
      }),
    })
  );
});
