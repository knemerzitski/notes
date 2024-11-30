/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, it, expect, describe, beforeAll } from 'vitest';

import { Changeset } from '~collab/changeset';
import { RevisionChangeset } from '~collab/records/record';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
  mockSubscriptionsModel,
  createMockedPublisher,
  mockSocketApi,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseError,
  expectGraphQLResponseData,
} from '../../../../../__tests__/helpers/graphql/response';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
  createMongoDBContext,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import {
  NoteCategory,
  UpdateNoteInsertRecordInput,
  UpdateNoteInsertRecordPayload,
} from '../../../types.generated';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION = `#graphql
  mutation($input: UpdateNoteInsertRecordInput!){
    updateNoteInsertRecord(input: $input) {
      newRecord {
        id
        creatorUser {
          id
        }
        change {
          revision
          changeset
        }
        beforeSelection {
          start
          end
        }
        afterSelection {
          start
          end
        }
      }
      isDuplicateRecord
      collabText {
        recordConnection(last: 1) {
          records {
            change {
              revision
            }
          }
        }
      }
      note {
        id
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    signedInUserEvents {
      mutations {
        __typename
        ... on UpdateNoteInsertRecordPayload {
          isDuplicateRecord
          newRecord {
            id
            creatorUser {
              id
            }
            change {
              revision
              changeset
            }
            beforeSelection {
              start
              end
            }
            afterSelection {
              start
              end
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
let noteFixedRecords: DBNoteSchema;
let userNoAccess: DBUserSchema;

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user, {
    collabText: {
      // Random records with revisions [11,12,13,14]
      initialText: 'head',
      recordsCount: 4,
      revisionOffset: 10,
    },
  });
  noteFixedRecords = fakeNotePopulateQueue(user, {
    collabText: {
      override: {
        headText: {
          revision: 5,
          changeset: ['abcdef'],
        },
        // Records with appending characters from "a" to "abcdef"
        records: [
          ['a'],
          [0, 'b'],
          [[0, 1], 'c'],
          [[0, 2], 'd'],
          [[0, 3], 'e'],
          [[0, 4], 'f'],
        ].map((changeset, index) => ({
          revision: index,
          changeset,
        })),
      },
    },
  });

  userAddNote(user, note, {
    override: {
      readOnly: false,
      categoryName: NoteCategory.DEFAULT,
    },
  });
  userAddNote(user, noteFixedRecords, {
    override: {
      readOnly: false,
      categoryName: NoteCategory.DEFAULT,
    },
  });
  userAddNote(userReadOnly, note, {
    override: {
      readOnly: true,
      categoryName: NoteCategory.DEFAULT,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input?: UpdateNoteInsertRecordInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateNoteInsertRecordPayload: UpdateNoteInsertRecordPayload;
    },
    { input?: UpdateNoteInsertRecordInput }
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('inserts record on headText revision (newRecord = headText)', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        generatedId: 'random',
        change: {
          revision: 14,
          changeset: Changeset.parseValue([[0, 3], '. after head']),
        },
        beforeSelection: {
          start: 4,
        },
        afterSelection: {
          start: 16,
        },
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    updateNoteInsertRecord: {
      newRecord: {
        id: `${objectIdToStr(note._id)}:15`,
        creatorUser: {
          id: objectIdToStr(user._id),
        },
        change: {
          revision: 15,
          changeset: [[0, 3], '. after head'],
        },
        beforeSelection: {
          start: 4,
          end: 4,
        },
        afterSelection: {
          start: 16,
          end: 16,
        },
      },
      isDuplicateRecord: false,
      collabText: {
        recordConnection: {
          records: [
            {
              change: {
                revision: 15,
              },
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: ['head. after head'],
          revision: 15,
        },
        tailText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 10,
        },
        records: expect.arrayContaining([
          expect.objectContaining({ revision: 14 }),
          {
            // Inserted after 14
            revision: 15,
            creatorUser: {
              _id: user._id,
            },
            changeset: [[0, 3], '. after head'],
            userGeneratedId: 'random',
            createdAt: expect.any(Date),
            beforeSelection: {
              start: 4,
            },
            afterSelection: {
              start: 16,
            },
          },
        ]),
        updatedAt: expect.any(Date),
      },
    })
  );
});

it('inserts record on older revision (tailText < newRecord < headText)', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        generatedId: 'aa',
        change: {
          revision: 12,
          changeset: Changeset.parseValue(['text on 12', [0, 3]]),
        },
        beforeSelection: {
          start: 0,
        },
        afterSelection: {
          start: 14,
        },
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    updateNoteInsertRecord: {
      newRecord: {
        id: expect.any(String),
        creatorUser: {
          id: objectIdToStr(user._id),
        },
        change: {
          revision: 15,
          changeset: [[0, 3], 'text on 12'],
        },
        beforeSelection: {
          start: 0,
          end: 0,
        },
        afterSelection: {
          start: 14,
          end: 14,
        },
      },
      isDuplicateRecord: false,
      collabText: {
        recordConnection: {
          records: [
            {
              change: {
                revision: 15,
              },
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: ['headtext on 12'],
          revision: 15,
        },
        tailText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 10,
        },
        records: expect.arrayContaining([
          expect.objectContaining({ revision: 14 }),
          {
            // Inserted after 14
            revision: 15,
            creatorUser: {
              _id: user._id,
            },
            changeset: [[0, 3], 'text on 12'],
            userGeneratedId: 'aa',
            createdAt: expect.any(Date),
            beforeSelection: {
              start: 0,
            },
            afterSelection: {
              start: 14,
            },
          },
        ]),
        updatedAt: expect.any(Date),
      },
    })
  );
});

it('returns existing record when new record is a duplicate of a previous one (idempotence)', async () => {
  function insertSameRecord() {
    return executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'will_be_dup',
          change: {
            revision: 14,
            changeset: Changeset.parseValue([[0, 3], '. after head']),
          },
          beforeSelection: {
            start: 4,
          },
          afterSelection: {
            start: 16,
          },
        },
      },
      {
        user,
      }
    );
  }

  await insertSameRecord();
  const response = await insertSameRecord();

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    updateNoteInsertRecord: {
      newRecord: {
        id: expect.any(String),
        creatorUser: {
          id: objectIdToStr(user._id),
        },
        change: {
          revision: 15,
          changeset: [[0, 3], '. after head'],
        },
        beforeSelection: {
          start: 4,
          end: 4,
        },
        afterSelection: {
          start: 16,
          end: 16,
        },
      },
      isDuplicateRecord: true,
      collabText: {
        recordConnection: {
          records: [
            {
              change: {
                revision: 15,
              },
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: ['head. after head'],
          revision: 15,
        },
        tailText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 10,
        },
        records: expect.arrayContaining([
          expect.objectContaining({ revision: 14 }),
          {
            // Inserted after 14
            revision: 15,
            creatorUser: {
              _id: user._id,
            },
            changeset: [[0, 3], '. after head'],
            userGeneratedId: 'will_be_dup',
            createdAt: expect.any(Date),
            beforeSelection: {
              start: 4,
            },
            afterSelection: {
              start: 16,
            },
          },
        ]),
        updatedAt: expect.any(Date),
      },
    })
  );
});

it('api options maxRecordsCount limits records exactly when new record is composed on headText', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        generatedId: 'aa',
        change: {
          revision: 14,
          changeset: Changeset.parseValue([[0, 3], '. after head']),
        },
        beforeSelection: {
          start: 4,
        },
        afterSelection: {
          start: 16,
        },
      },
    },
    {
      user,
      override: {
        options: {
          collabText: {
            maxRecordsCount: 3,
          },
        },
      },
    }
  );

  expectGraphQLResponseData(response);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: ['head. after head'],
          revision: 15,
        },
        tailText: {
          changeset: ['head'],
          revision: 12,
        },
        records: [
          expect.objectContaining({ revision: 13 }),
          expect.objectContaining({ revision: 14 }),
          expect.objectContaining({ revision: 15 }),
        ],
        updatedAt: expect.any(Date),
      },
    })
  );
});

it('api options maxRecordsCount keeps 1 extra record when new record is composed on older revision', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        generatedId: 'aa',
        change: {
          revision: 13,
          changeset: Changeset.parseValue(['on 13']),
        },
        beforeSelection: {
          start: 4,
        },
        afterSelection: {
          start: 16,
        },
      },
    },
    {
      user,
      override: {
        options: {
          collabText: {
            maxRecordsCount: 1,
          },
        },
      },
    }
  );

  expectGraphQLResponseData(response);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: ['headon 13'],
          revision: 15,
        },
        tailText: {
          changeset: ['head'],
          revision: 13,
        },
        records: [
          expect.objectContaining({ revision: 14 }),
          expect.objectContaining({ revision: 15 }),
        ],
        updatedAt: expect.any(Date),
      },
    })
  );
});

describe('with other MongoDB context', () => {
  let mongoDBContext2: Awaited<ReturnType<typeof createMongoDBContext>>;
  let generatedId = 0;

  async function insertChange(
    change: RevisionChangeset,
    options?: CreateGraphQLResolversContextOptions
  ) {
    const response = await executeOperation(
      {
        noteId: noteFixedRecords._id,
        insertRecord: {
          generatedId: String(generatedId++),
          change,
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 0,
          },
        },
      },
      options
    );
    expectGraphQLResponseData(response);
  }

  beforeAll(async () => {
    mongoDBContext2 = await createMongoDBContext();
  });

  beforeEach(() => {
    generatedId = 0;
    mongoCollectionStats.mockClear();
  });

  it.each([...new Array<undefined>(4).keys()])(
    'handles two record insertions for the same revision at the same time using transactions (attempt %i)',
    async () => {
      await Promise.all([
        insertChange(
          {
            changeset: Changeset.parseValue([[0, 5], 'A']),
            revision: 5,
          },
          { user }
        ),
        insertChange(
          {
            changeset: Changeset.parseValue([[0, 5], 'B']),
            revision: 5,
          },
          // Second insert with a different mongo client
          {
            user,
            mongoDB: {
              client: mongoDBContext2.mongoClient,
              collections: mongoDBContext2.mongoCollections,
            },
          }
        ),
      ]);

      expect(mongoCollectionStats.readAndModifyCount()).lessThanOrEqual(4);

      // Database, Note
      const dbNote = await mongoCollections.notes.findOne({
        _id: noteFixedRecords._id,
      });

      expect(dbNote).toStrictEqual(
        expect.objectContaining({
          collabText: expect.objectContaining({
            headText: {
              changeset: ['abcdefAB'],
              revision: 7,
            },
            tailText: {
              changeset: Changeset.EMPTY.serialize(),
              revision: 0,
            },
          }),
        })
      );

      // Check last 2 records (could be inserted in any order)
      expect([
        [
          { changeset: [[0, 5], 'A'], revision: 6 },
          { changeset: [[0, 6], 'B'], revision: 7 },
        ],
        [
          { changeset: [[0, 5], 'B'], revision: 6 },
          { changeset: [[0, 5], 'A', 6], revision: 7 },
        ],
      ]).toContainEqual(
        dbNote?.collabText?.records
          .slice(6)
          .map(({ changeset, revision }) => ({ changeset, revision }))
      );
    }
  );
});

describe('subscription', () => {
  it('publishes new record insertion to every user', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as Subscription,
    ]);

    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'in-subscription',
          change: {
            revision: 14,
            changeset: Changeset.parseValue([[0, 3], '. after head. published']),
          },
          beforeSelection: {
            start: 4,
          },
          afterSelection: {
            start: 26,
          },
        },
      },
      {
        user,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      signedInUserTopic(user._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      signedInUserTopic(userReadOnly._id)
    );

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'UpdateNoteInsertRecordPayload',
                  newRecord: {
                    id: `${objectIdToStr(note._id)}:15`,
                    creatorUser: {
                      id: objectIdToStr(user._id),
                    },
                    change: {
                      revision: 15,
                      changeset: [[0, 3], '. after head. published'],
                    },
                    beforeSelection: {
                      start: 4,
                      end: 4,
                    },
                    afterSelection: {
                      start: 26,
                      end: 26,
                    },
                  },
                  isDuplicateRecord: false,
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toHaveBeenNthCalledWith(2, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'UpdateNoteInsertRecordPayload',
                  newRecord: {
                    id: `${objectIdToStr(note._id)}:15`,
                    creatorUser: {
                      id: objectIdToStr(user._id),
                    },
                    change: {
                      revision: 15,
                      changeset: [[0, 3], '. after head. published'],
                    },
                    beforeSelection: {
                      start: 4,
                      end: 4,
                    },
                    afterSelection: {
                      start: 26,
                      end: 26,
                    },
                  },
                  isDuplicateRecord: false,
                },
              ],
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });

  it('duplicate/existing record is not published', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as Subscription,
    ]);

    function insertSameRecord() {
      return executeOperation(
        {
          noteId: note._id,
          insertRecord: {
            generatedId: 'in-subscription',
            change: {
              revision: 14,
              changeset: Changeset.parseValue(['val']),
            },
            beforeSelection: {
              start: 0,
            },
            afterSelection: {
              start: 3,
            },
          },
        },
        {
          user,
          createPublisher: createMockedPublisher,
        }
      );
    }

    await insertSameRecord();
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);
    expect(mockSocketApi.post).toBeCalledTimes(2);

    const response = await insertSameRecord();
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);
    expect(mockSocketApi.post).toBeCalledTimes(2);
  });
});

describe('errors', () => {
  it('throws error if attempting to add record with read-only access', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'ab',
          change: {
            revision: 14,
            changeset: Changeset.fromInsertion('never'),
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 9,
          },
        },
      },
      { user: userReadOnly }
    );

    expectGraphQLResponseError(response, /note is read-only/i);
  });

  it('throws error when new record revision is older than tailText (newRecord < tailText)', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'aa',
          change: {
            revision: 9, // tailText is 10
            changeset: Changeset.EMPTY,
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 18,
          },
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseError(response, /is too old/i);
  });

  it('throws error when new record revision is newer than headText (headText < newRecord)', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'aa',
          change: {
            revision: 15, // headText is 14
            changeset: Changeset.EMPTY,
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 18,
          },
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseError(response, /revision is invalid/i);
  });

  it('throws error when record changeset cannot be composed on headText', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'aa',
          change: {
            revision: 14,
            changeset: Changeset.parseValue([[0, 10], ' too many retained characters']),
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 0,
          },
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseError(response, /changeset is invalid/i);
  });

  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
        insertRecord: {
          generatedId: 'ab',
          change: {
            revision: 14,
            changeset: Changeset.fromInsertion('never'),
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 9,
          },
        },
      },
      { user }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          generatedId: 'ab',
          change: {
            revision: 14,
            changeset: Changeset.fromInsertion('never'),
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 9,
          },
        },
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseError(response, /note not found/i);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
      insertRecord: {
        generatedId: 'ab',
        change: {
          revision: 14,
          changeset: Changeset.fromInsertion('never'),
        },
        beforeSelection: {
          start: 0,
        },
        afterSelection: {
          start: 9,
        },
      },
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
