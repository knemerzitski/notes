/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apolloServer } from '../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../__tests__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__tests__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { NoteCategory, UserNoteLink } from '../../types.generated';
import { UserNoteLink_id } from '../../../../services/note/user-note-link-id';
import { objectIdToStr } from '../../../../mongodb/utils/objectid';

interface Variables {
  userId: ObjectId;
  noteId: ObjectId;
  recordsLast?: number;
}

const QUERY = `#graphql
  query($userId: ObjectID!, $noteId: ObjectID!, $recordsLast: PositiveInt){
    signedInUser(by: {id: $userId}) {
      noteLink(by: {id: $noteId}){
        note {
          collabText {
            headText {
              revision
              changeset
            }
            recordConnection(last: $recordsLast) {
              edges {
                node {
                  change {
                    revision
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

let user: DBUserSchema;
let userReadOnly: DBUserSchema;
let note: DBNoteSchema;
let userNoAccess: DBUserSchema;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user, {
    collabText: {
      recordsCount: 2,
    },
  });
  userAddNote(user, note);

  userAddNote(userReadOnly, note, {
    override: {
      readOnly: true,
      categoryName: NoteCategory.DEFAULT,
    },
  });

  await populateExecuteAll();
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

async function executeOperation(
  variables: Variables,
  options?: CreateGraphQLResolversContextOptions,
  query: string = QUERY
) {
  return await apolloServer.executeOperation<
    {
      userNoteLink: UserNoteLink;
    },
    Variables
  >(
    {
      query,
      variables,
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('returns note', async () => {
  const response = await executeOperation(
    {
      userId: user._id,
      noteId: note._id,
      recordsLast: 2,
    },
    { user }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    signedInUser: {
      noteLink: {
        note: {
          collabText: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordConnection: {
              edges: [
                {
                  node: {
                    change: {
                      revision: expect.any(Number),
                    },
                  },
                },
                {
                  node: {
                    change: {
                      revision: expect.any(Number),
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

it('returns note users', async () => {
  const response = await executeOperation(
    {
      userId: userReadOnly._id,
      noteId: note._id,
    },
    { user: userReadOnly },
    `#graphql
    query($userId: ObjectID!, $noteId: ObjectID!) {
      signedInUser(by: {id: $userId}) {
        noteLink(by: {id: $noteId}) {
          id
          note {
            id
            users {
              user {
                id
                profile {
                  displayName
                }
              }
              isOwner
            }
          }
        }
      }
    }
    `
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    signedInUser: {
      noteLink: {
        id: UserNoteLink_id(note._id, userReadOnly._id),
        note: {
          id: objectIdToStr(note._id),
          users: [
            {
              user: {
                id: objectIdToStr(user._id),
                profile: {
                  displayName: user.profile.displayName,
                },
              },
              isOwner: true,
            },
            {
              user: {
                id: objectIdToStr(userReadOnly._id),
                profile: {
                  displayName: userReadOnly.profile.displayName,
                },
              },
              isOwner: true,
            },
          ],
        },
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );
});

it('textAtRevision', async () => {
  const QUERY_TEXT_AT_REVISION = `#graphql
    query($userId: ObjectID!, $noteId: ObjectID!, $tailRevision: NonNegativeInt!) {
      signedInUser(by: {id: $userId}) {
        noteLink(by: {id: $noteId}) {
          note {
            collabText {
              textAtRevision(revision: $tailRevision) {
                revision
                changeset
              }
            }
          }
        }
      }
    }
  `;

  const response = await apolloServer.executeOperation<
    {
      userNoteLink: UserNoteLink;
    },
    { userId: ObjectId; noteId: ObjectId; tailRevision: number }
  >(
    {
      query: QUERY_TEXT_AT_REVISION,
      variables: {
        userId: user._id,
        noteId: note._id,
        tailRevision: 1,
      },
    },
    {
      contextValue: createGraphQLResolversContext({
        user,
      }),
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toMatchInlineSnapshot(`
    {
      "signedInUser": {
        "noteLink": {
          "note": {
            "collabText": {
              "textAtRevision": {
                "changeset": [
                  "canal fabulous",
                ],
                "revision": 1,
              },
            },
          },
        },
      },
    }
  `);
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        userId: user._id,
        noteId: new ObjectId(),
      },
      { user }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        userId: userNoAccess._id,
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws error if unknown userId', async () => {
    const response = await executeOperation({
      userId: new ObjectId(),
      noteId: note._id,
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
