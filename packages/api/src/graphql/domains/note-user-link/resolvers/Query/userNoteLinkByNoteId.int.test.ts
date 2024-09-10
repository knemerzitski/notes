/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__test__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__test__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import {
  NoteCategory,
  NoteTextField,
  UserNoteLink,
} from '../../../../domains/types.generated';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import { findNoteUser } from '../../../../../services/note/note';

interface Variables {
  noteId: ObjectId;
  recordsLast?: number;
  fieldName?: NoteTextField;
}

const QUERY = `#graphql
  query($noteId: ObjectID!, $recordsLast: PositiveInt, $fieldName: NoteTextField){
    userNoteLinkByNoteId(noteId: $noteId){
      note {
        collab {
          textFields(name: $fieldName) {
            key
            value {
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
  }
`;

let user: DBUserSchema;
let userReadOnly: DBUserSchema;
let note: DBNoteSchema;
let noteArchive: DBNoteSchema;
let userNoAccess: DBUserSchema;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user, {
    collabTexts: mapObject(NoteTextField, (_, fieldName) => [
      fieldName,
      {
        recordsCount: 2,
      },
    ]),
  });
  userAddNote(user, note);

  noteArchive = fakeNotePopulateQueue(user);
  userAddNote(user, noteArchive, {
    override: {
      readOnly: true,
      categoryName: NoteCategory.ARCHIVE,
    },
  });

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
      userNoteLinkByNoteId: UserNoteLink;
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
      noteId: note._id,
      recordsLast: 2,
    },
    { user }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    userNoteLinkByNoteId: {
      note: {
        collab: {
          textFields: [
            {
              key: 'CONTENT',
              value: {
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
            {
              key: 'TITLE',
              value: {
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

it('returns note specified textField', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      recordsLast: 2,
      fieldName: NoteTextField.TITLE,
    },
    { user }
  );

  const data = expectGraphQLResponseData(response);

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );

  expect(data).toEqual({
    userNoteLinkByNoteId: {
      note: {
        collab: {
          textFields: [
            {
              key: 'TITLE',
              value: {
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
          ],
        },
      },
    },
  });
});

it('returns note users', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    { user: userReadOnly },
    `#graphql
      query($noteId: ObjectID!){
        userNoteLinkByNoteId(noteId: $noteId){
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
              createdAt
            }
          }
        }
      }
    `
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    userNoteLinkByNoteId: {
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
            createdAt: findNoteUser(user._id, note)?.createdAt,
          },
          {
            user: {
              id: objectIdToStr(userReadOnly._id),
              profile: {
                displayName: userReadOnly.profile.displayName,
              },
            },
            createdAt: findNoteUser(userReadOnly._id, note)?.createdAt,
          },
        ],
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

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user }
    );

    expectGraphQLResponseError(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
    });

    expectGraphQLResponseError(response, /.*must be signed in.*/);
  });
});