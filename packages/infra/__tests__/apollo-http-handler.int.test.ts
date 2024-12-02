/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Runs GraphQL API with an actual lambda Docker container

import { beforeEach, expect, it } from 'vitest';

import { resetDatabase } from '~api/__tests__/helpers/mongodb/mongodb';
import { CustomHeaderName } from '~api-app-shared/custom-headers';

// TODO use api e2e test helpers

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
  const res = await fetch('http://127.0.0.1:3000/graphql', {
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

  await res.json();

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
  const res = await fetch('http://127.0.0.1:3000/graphql', {
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

  await res.json();

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
  const res = await fetch('http://127.0.0.1:3000/graphql', {
    method: 'POST',
    headers: {
      ...user.headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'Notes_Query',
      variables: {
        first: 100,
      },
      query: `#graphql
        query Notes_Query($first: NonNegativeInt) {
          userNoteLinkConnection(first: $first) {
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
      `,
    }),
  });

  return res.json();
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
        userNoteLinkConnection: {
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
    });
  }
);
