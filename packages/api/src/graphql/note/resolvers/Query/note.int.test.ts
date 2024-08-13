/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseErrorMessage,
} from '../../../../__test__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { Note, NoteCategory, NoteTextField } from '../../../types.generated';


interface Variables {
  noteId: ObjectId;
  recordsLast?: number;
  fieldName?: NoteTextField;
}

const QUERY = `#graphql
  query($noteId: ObjectID!, $recordsLast: PositiveInt, $fieldName: NoteTextField){
    note(noteId: $noteId){
      textFields(name: $fieldName) {
        key
        value {
          headText {
            revision
            changeset
          }
          recordsConnection(last: $recordsLast) {
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
`;

let user: UserSchema;
let userReadOnly: UserSchema;
let note: NoteSchema;
let noteArchive: NoteSchema;
let userNoAccess: UserSchema;

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
      note: Note;
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
    note: {
      textFields: [
        {
          key: 'CONTENT',
          value: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordsConnection: {
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
            recordsConnection: {
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
    note: {
      textFields: [
        {
          key: 'TITLE',
          value: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordsConnection: {
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
  });
});

describe('errors', () => {
  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
      },
      { user }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
    });

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});
