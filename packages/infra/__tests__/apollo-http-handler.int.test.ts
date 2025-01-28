/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Runs GraphQL API with an actual lambda Docker container

import { beforeEach, expect, it } from 'vitest';

import { resetDatabase } from '~api/__tests__/helpers/mongodb/mongodb';
import { CustomHeaderName } from '~api-app-shared/custom-headers';

// TODO use api e2e test helpers

const fetchUrl = new URL(process.env.AWS_REST_API_URL!);
fetchUrl.pathname = 'graphql';

beforeEach(async () => {
  await resetDatabase();
});

interface User {
  headers: {
    [CustomHeaderName.USER_ID]: string;
    Cookie: string[];
  };
}

async function fetchSignIn(): Promise<User> {
  const res = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'SignIn',
      variables: {
        input: {
          auth: {
            google: {
              token: '{"id":"1","name":"test","email":"test@test"}',
            },
          },
        },
      },
      query: `#graphql
        mutation SignIn($input: SignInInput!){
          signIn(input: $input) {
            __typename
            ... on SignInResult {
              signedInUser {
                id
              }
            }
          }
        }
      `,
    }),
  });

  const graphQLResponse = await res.json();
  expectNoErrors(graphQLResponse);

  const cookie = res.headers.getSetCookie();
  const userId = cookie[0]?.substring(9, cookie[0].indexOf(':'));

  return {
    headers: {
      [CustomHeaderName.USER_ID]: userId ?? '',
      Cookie: cookie,
    },
  };
}

async function fetchCreateNote(user: User, content: string): Promise<User> {
  const res = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      ...user.headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'CreateNote',
      variables: {
        input: {
          collabText: {
            initialText: content,
          },
        },
      },
      query: `#graphql
        mutation CreateNote($input: CreateNoteInput!) {
          createNote(input:$input) {
            userNoteLink {
              id
            }
          }
        }
      `,
    }),
  });

  const graphQLResponse = await res.json();
  expectNoErrors(graphQLResponse);

  const cookie = res.headers.getSetCookie();
  const userId = cookie[0]?.substring(9, cookie[0].indexOf(':'));

  return {
    headers: {
      [CustomHeaderName.USER_ID]: userId ?? '',
      Cookie: cookie,
    },
  };
}

async function fetchNotes(user: User) {
  const res = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      ...user.headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'Notes_Query',
      variables: {
        userId: user.headers[CustomHeaderName.USER_ID],
        first: 100,
      },
      query: `#graphql
        query Notes_Query($userId: ObjectID!, $first: NonNegativeInt) {
          signedInUser(by: {id: $userId}) {
            noteLinkConnection(first: $first) {
              edges {
                node {
                  id
                  categoryName
                  note {
                    id
                    collabText {
                      id
                      headText {
                        revision
                        changeset
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    }),
  });

  const graphQLResponse = await res.json();
  expectNoErrors(graphQLResponse);

  return graphQLResponse;
}

function expectNoErrors(response: any) {
  expect(response.errors, JSON.stringify(response.errors, null, 2)).toBeUndefined();
}

it(
  'runs without errors, creates user, note and fetches created note',
  {
    timeout: 20000,
  },
  async () => {
    const user = await fetchSignIn();

    await fetchCreateNote(user, 'hello new note');

    const notes = await fetchNotes(user);

    expect(notes).toStrictEqual({
      data: {
        signedInUser: {
          noteLinkConnection: {
            edges: [
              {
                node: {
                  categoryName: 'DEFAULT',
                  id: expect.any(String),
                  note: {
                    collabText: {
                      headText: {
                        changeset: ['hello new note'],
                        revision: 1,
                      },
                      id: expect.any(String),
                    },
                    id: expect.any(String),
                  },
                },
              },
            ],
          },
        },
      },
    });
  }
);
