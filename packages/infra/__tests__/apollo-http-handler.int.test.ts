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
      operationName: 'UseSignInWithGoogle',
      variables: {
        input: {
          provider: 'GOOGLE',
          credentials: {
            token: '{"id":"1","name":"test","email":"test@test"}',
          },
        },
      },
      query:
        'mutation UseSignInWithGoogle($input: SignInInput!) {\n  signIn(input: $input) {\n    user {\n      id\n      profile {\n        displayName\n        __typename\n      }\n      __typename\n    }\n    authProviderUser {\n      id\n      email\n      __typename\n    }\n    __typename\n  }\n}',
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
      operationName: 'UseCreateNote',
      variables: {
        input: {
          note: {
            textFields: [
              {
                key: 'CONTENT',
                value: {
                  initialText: content,
                },
              },
            ],
          },
        },
      },
      query:
        'mutation UseCreateNote($input: CreateNoteInput!) {\n  createNote(input: $input) {\n    note {\n      id\n      contentId\n      textFields {\n        key\n        value {\n          id\n          headText {\n            revision\n            changeset\n            __typename\n          }\n          recordsConnection {\n            records {\n              id\n              creatorUserId\n              change {\n                revision\n                changeset\n                __typename\n              }\n              beforeSelection {\n                start\n                end\n                __typename\n              }\n              afterSelection {\n                start\n                end\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}',
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
      operationName: 'NotesRouteNotesConnection',
      variables: {
        last: 100,
      },
      query:
        'query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {\n  notesConnection(last: $last, before: $before) {\n    notes {\n      id\n      contentId\n      isOwner\n      textFields {\n        key\n        value {\n          id\n          headText {\n            revision\n            changeset\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    pageInfo {\n      hasPreviousPage\n      startCursor\n      __typename\n    }\n    __typename\n  }\n}',
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
        notesConnection: {
          notes: [
            {
              id: expect.any(String),
              contentId: expect.any(String),
              isOwner: true,
              textFields: [
                {
                  key: 'CONTENT',
                  value: {
                    id: expect.any(String),
                    headText: {
                      revision: 1,
                      changeset: ['hello new note'],
                      __typename: 'RevisionChangeset',
                    },
                    __typename: 'CollabText',
                  },
                  __typename: 'NoteTextFieldEntry',
                },
                {
                  key: 'TITLE',
                  value: {
                    id: expect.any(String),
                    headText: {
                      revision: 1,
                      changeset: [],
                      __typename: 'RevisionChangeset',
                    },
                    __typename: 'CollabText',
                  },
                  __typename: 'NoteTextFieldEntry',
                },
              ],
              __typename: 'Note',
            },
          ],
          pageInfo: {
            hasPreviousPage: false,
            startCursor: expect.any(String),
            __typename: 'PageInfo',
          },
          __typename: 'NoteConnection',
        },
      },
    });
  }
);
