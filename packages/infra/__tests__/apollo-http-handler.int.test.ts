/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Runs GraphQL API with an actual lambda Docker container

import { afterEach } from 'node:test';

import { beforeEach, expect, it } from 'vitest';

import { expectGraphQLResponseData } from '../../api/src/__tests__/helpers/graphql/response';
import { resetDatabase } from '../../api/src/__tests__/helpers/mongodb/instance';
import { apolloFetchGraphQL } from '../../utils/src/testing/apollo-fetch-graphql';
import { NodeHttpSession } from '../../utils/src/testing/node-http-session';

const API_URL = new URL(process.env.AWS_REST_API_URL!);
API_URL.pathname = 'graphql';

const SIGN_IN = `#graphql
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
`;

const CREATE_NOTE = `#graphql
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      userNoteLink {
        id
      }
    }
  }
`;

const NOTES_QUERY = `#graphql
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
`;

const httpSession = new NodeHttpSession();

function fetchGraphQL(request: Parameters<typeof apolloFetchGraphQL>[0]) {
  return apolloFetchGraphQL(request, {
    url: API_URL.toString(),
    fetchFn: httpSession.fetch.bind(httpSession),
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  httpSession.reset();
});

async function fetchSignIn() {
  const { graphQLResponse } = await fetchGraphQL({
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
    query: SIGN_IN,
  });

  expectGraphQLResponseData(graphQLResponse);

  return {
    userId: graphQLResponse.body.singleResult.data!.signIn.signedInUser.id,
  };
}

async function fetchCreateNote({
  userId,
  content,
}: {
  userId: string;
  content: string;
}): Promise<void> {
  const { graphQLResponse } = await fetchGraphQL({
    operationName: 'CreateNote',
    variables: {
      input: {
        authUser: {
          id: userId,
        },
        collabText: {
          initialText: content,
        },
      },
    },
    query: CREATE_NOTE,
  });

  expectGraphQLResponseData(graphQLResponse);
}

async function fetchNotes({ userId }: { userId: string }) {
  const { graphQLResponse } = await fetchGraphQL({
    operationName: 'Notes_Query',
    variables: {
      userId: userId,
      first: 100,
    },
    query: NOTES_QUERY,
  });

  expectGraphQLResponseData(graphQLResponse);

  return graphQLResponse.body.singleResult;
}

it(
  'runs without errors, creates user, note and fetches created note',
  {
    timeout: 20000,
  },
  async () => {
    const { userId } = await fetchSignIn();

    await fetchCreateNote({ userId, content: 'hello new note' });

    const notes = await fetchNotes({ userId });

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
