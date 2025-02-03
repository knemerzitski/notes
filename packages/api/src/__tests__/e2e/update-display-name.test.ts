/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeEach, expect, it, vi } from 'vitest';

import {
  SignInInput,
  SignInPayload,
  SignOutInput,
  SignOutPayload,
  UpdateSignedInUserDisplayNameInput,
  UpdateSignedInUserDisplayNamePayload,
} from '../../graphql/domains/types.generated';

import { strToObjectId } from '../../mongodb/utils/objectid';
import { fetchGraphQL } from '../helpers/e2e/fetch-graphql';
import { HttpSession } from '../helpers/e2e/http-session';
import { createGraphQLWebSocket } from '../helpers/e2e/websocket';
import { expectGraphQLResponseData } from '../helpers/graphql/response';
import { mongoCollections, resetDatabase } from '../helpers/mongodb/mongodb';

beforeEach(async () => {
  faker.seed(76572);
  await resetDatabase();
});

it('creates new user, updates displayName and publishes it to websocket', async () => {
  const httpSession = new HttpSession();
  const fetchFn = httpSession.fetch.bind(httpSession);

  // Sign in first time
  const { graphQLResponse: signInResponse } = await fetchGraphQL<
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
                profile {
                  displayName
                }
              }
            }
          }
        }
      `,
      variables: {
        input: {
          auth: {
            google: {
              token: JSON.stringify({
                id: '1',
                name: 'Foo Bar',
                email: 'foo.bar@localhost.com',
              }),
            },
          },
        },
      },
    },
    fetchFn
  );
  const signInData = expectGraphQLResponseData(signInResponse);
  const userId = signInData.signIn.signedInUser.id;
  const userIdStr = String(userId);

  // Start WebSocket subscription
  const ws = await createGraphQLWebSocket({
    headers: httpSession.getHeaders(),
  });
  const wsNextUpdateDisplayNameFn = vi.fn();
  ws.subscribe(
    {
      query: `#graphql
        subscription UserEvents($input: SignedInUserEventsInput!) {
          signedInUserEvents(input: $input) {
            mutations {
              ... on UpdateSignedInUserDisplayNamePayload {
                displayName
              }
            }
          }
        }
      `,
      variables: {
        input: {
          authUser: {
            id: userIdStr,
          },
        },
      },
    },
    wsNextUpdateDisplayNameFn
  );

  // Subscription might not have been persisted yet
  await new Promise((res) => {
    setTimeout(res, 50);
  });

  // Update displayName
  const { graphQLResponse: updateDisplayNameResponse } = await fetchGraphQL<
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
          authUser: {
            id: userIdStr as any,
          },
          displayName: 'Bar Name',
        },
      },
    },
    fetchFn
  );

  const updateDisplayNameData = expectGraphQLResponseData(updateDisplayNameResponse);
  expect(updateDisplayNameData.updateSignedInUserDisplayName.displayName).toStrictEqual(
    'Bar Name'
  );
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
  const { graphQLResponse: signOutResponse } = await fetchGraphQL<
    { signOut: SignOutPayload },
    { input: SignOutInput }
  >(
    {
      query: `#graphql
        mutation SignOut($input: SignOutInput!) {
          signOut(input: $input) {
            availableUserIds
          }
        }
      `,
      variables: {
        input: {
          user: {
            id: userIdStr as any,
          },
        },
      },
    },
    fetchFn
  );
  const signOutData = expectGraphQLResponseData(signOutResponse);
  expect(signOutData.signOut.availableUserIds).toHaveLength(0);

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
