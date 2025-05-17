/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, it, expect, describe, beforeAll } from 'vitest';

import { Subscription } from '../../../../../../../lambda-graphql/src/dynamodb/models/subscription';

import { Changeset, Selection } from '../../../../../../../collab2/src';

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
import { createMongoDBContext } from '../../../../../__tests__/helpers/mongodb/context';
import {
  resetDatabase,
  mongoCollections,
  mongoCollectionStats,
} from '../../../../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBCollabRecordSchema } from '../../../../../mongodb/schema/collab-record';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import {
  Maybe,
  NoteCategory,
  UpdateNoteInsertRecordInput,
  UpdateNoteInsertRecordPayload,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION = `#graphql
  mutation($input: UpdateNoteInsertRecordInput!){
    updateNoteInsertRecord(input: $input) {
      newRecord {
        id
        author {
          id
        }
        revision
        changeset
        selectionInverse
        selection
      }
      isDuplicateRecord
      collabText {
        recordConnection(last: 1) {
          records {
            revision
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
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on UpdateNoteInsertRecordPayload {
          isDuplicateRecord
          newRecord {
            id
            author {
              id
            }
            revision
            changeset
            selectionInverse
            selection
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
  ({ note } = fakeNotePopulateQueue(user, {
    collabText: {
      // Random records with revisions [11,12,13,14]
      initialText: 'head',
      records: 4,
      revisionOffset: 10,
    },
  }));

  ({ note: noteFixedRecords } = fakeNotePopulateQueue(user, {
    collabText: {
      override: {
        headText: {
          revision: 6,
          changeset: Changeset.fromText('abcdef').serialize(),
        },
      },
      // Records with appending characters from "a" to "abcdef"
      records: [
        Changeset.parse('0:"a"').serialize(), // 1
        Changeset.parse('1:0,"b"').serialize(), // 2
        Changeset.parse('2:0-1,"c"').serialize(), // 3
        Changeset.parse('3:0-2,"d"').serialize(), // 4
        Changeset.parse('4:0-3,"e"').serialize(), // 5
        Changeset.parse('5:0-4,"f"').serialize(), // 6
      ].map((changeset, index) => ({
        revision: index + 1,
        changeset,
      })),
    },
  }));

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
  input: Omit<UpdateNoteInsertRecordInput, 'note' | 'authUser'> & {
    noteId: ObjectId;
  },
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
        input: {
          insertRecord: input.insertRecord,
          note: {
            id: input.noteId,
          },
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

async function getCollabTextRecords(
  note: Maybe<DBNoteSchema>
): Promise<DBCollabRecordSchema[]> {
  if (note == null) {
    return [];
  }
  const collabRecords = await mongoCollections.collabRecords
    .find({
      collabTextId: note._id,
    })
    .toArray();

  return collabRecords;
}

it('inserts record on headText revision (newRecord = headText)', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        id: 'random',
        targetRevision: 14,
        changeset: Changeset.parse('4:0-3,". after head"'),
        selectionInverse: Selection.create(4),
        selection: Selection.create(16),
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
        author: {
          id: objectIdToStr(user._id),
        },
        revision: 15,
        changeset: Changeset.parse('4:0-3,". after head"').serialize(),
        selectionInverse: Selection.create(4).serialize(),
        selection: Selection.create(16).serialize(),
      },
      isDuplicateRecord: false,
      collabText: {
        recordConnection: {
          records: [
            {
              revision: 15,
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  // Database
  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  // Note
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: Changeset.fromText('head. after head').serialize(),
          revision: 15,
        },
        tailText: {
          changeset: Changeset.fromText('head').serialize(),
          revision: 10,
        },
        updatedAt: expect.any(Date),
      },
    })
  );

  // CollabRecords
  expect((await getCollabTextRecords(dbNote)).slice(-2)).toStrictEqual([
    expect.objectContaining({
      revision: 14,
    }),
    {
      _id: expect.any(ObjectId),
      collabTextId: note._id,
      revision: 15,
      creatorUser: {
        _id: user._id,
      },
      changeset: Changeset.parse('4:0-3,". after head"').serialize(),
      inverse: Changeset.parse('16:0-3').serialize(),
      userGeneratedId: 'random',
      createdAt: expect.any(Date),
      beforeSelection: Selection.create(4).serialize(),
      afterSelection: Selection.create(16).serialize(),
    },
  ]);

  return;
});

it('inserts record on older revision (tailText < newRecord < headText)', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        id: 'aa',
        targetRevision: 12,
        changeset: Changeset.parse('4:"text on 12",0-3'),
        selectionInverse: Selection.create(0),
        selection: Selection.create(14),
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
        author: {
          id: objectIdToStr(user._id),
        },
        revision: 15,
        changeset: Changeset.parse('4:0-3,"text on 12"').serialize(),
        selectionInverse: Selection.create(4).serialize(),
        selection: Selection.create(14).serialize(),
      },
      isDuplicateRecord: false,
      collabText: {
        recordConnection: {
          records: [
            {
              revision: 15,
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  // Database
  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  // Note
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: Changeset.parse('0:"headtext on 12"').serialize(),
          revision: 15,
        },
        tailText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: 10,
        },
        updatedAt: expect.any(Date),
      },
    })
  );

  // CollabRecords
  expect((await getCollabTextRecords(dbNote)).slice(-2)).toStrictEqual([
    expect.objectContaining({
      revision: 14,
    }),
    // New record inserted after 14 (followed from 12)
    {
      _id: expect.any(ObjectId),
      collabTextId: note._id,
      revision: 15,
      creatorUser: {
        _id: user._id,
      },
      changeset: Changeset.parse('4:0-3,"text on 12"').serialize(),
      inverse: Changeset.parse('14:0-3').serialize(),
      userGeneratedId: 'aa',
      createdAt: expect.any(Date),
      beforeSelection: Selection.create(4).serialize(),
      afterSelection: Selection.create(14).serialize(),
    },
  ]);

  return;
});

it('returns existing record when new record is a duplicate of a previous one (idempotence)', async () => {
  function insertSameRecord() {
    return executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          id: 'will_be_dup',
          targetRevision: 14,
          changeset: Changeset.parse('4:0-3,". after head"'),
          selectionInverse: Selection.create(4),
          selection: Selection.create(16),
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
        author: {
          id: objectIdToStr(user._id),
        },
        revision: 15,
        changeset: Changeset.parse('4:0-3,". after head"').serialize(),
        selectionInverse: Selection.create(4).serialize(),
        selection: Selection.create(16).serialize(),
      },
      isDuplicateRecord: true,
      collabText: {
        recordConnection: {
          records: [
            {
              revision: 15,
            },
          ],
        },
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  // Database
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  // Note
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: Changeset.parse('0:"head. after head"').serialize(),
          revision: 15,
        },
        tailText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: 10,
        },
        updatedAt: expect.any(Date),
      },
    })
  );

  // CollabRecords
  expect((await getCollabTextRecords(dbNote)).slice(-2)).toStrictEqual([
    expect.objectContaining({
      revision: 14,
    }),
    {
      _id: expect.any(ObjectId),
      collabTextId: note._id,
      // Inserted after 14
      revision: 15,
      creatorUser: {
        _id: user._id,
      },
      changeset: Changeset.parse('4:0-3,". after head"').serialize(),
      inverse: Changeset.parse('16:0-3').serialize(),
      userGeneratedId: 'will_be_dup',
      createdAt: expect.any(Date),
      beforeSelection: Selection.create(4).serialize(),
      afterSelection: Selection.create(16).serialize(),
    },
  ]);
});

it('api options maxRecordsCount limits records exactly when new record is composed on headText', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        id: 'aa',
        targetRevision: 14,
        changeset: Changeset.parse('4:0-3,". after head"'),
        selectionInverse: Selection.create(4),
        selection: Selection.create(16),
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

  // Database
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  // Note
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: Changeset.parse('0:"head. after head"').serialize(),
          revision: 15,
        },
        tailText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: 12,
        },
        updatedAt: expect.any(Date),
      },
    })
  );

  // CollabRecords
  expect(await getCollabTextRecords(dbNote)).toStrictEqual([
    expect.objectContaining({ revision: 13 }),
    expect.objectContaining({ revision: 14 }),
    expect.objectContaining({ revision: 15 }),
  ]);
});

it('api options maxRecordsCount keeps 1 extra record when new record is composed on older revision', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      insertRecord: {
        id: 'aa',
        targetRevision: 13,
        changeset: Changeset.parse('4:"on 13"'),
        selectionInverse: Selection.create(4),
        selection: Selection.create(16),
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

  // Database
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });

  // Note
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      collabText: {
        headText: {
          changeset: Changeset.parse('0:"headon 13"').serialize(),
          revision: 15,
        },
        tailText: {
          changeset: Changeset.parse('0:"head"').serialize(),
          revision: 13,
        },
        updatedAt: expect.any(Date),
      },
    })
  );

  // CollabRecords
  expect(await getCollabTextRecords(dbNote)).toStrictEqual([
    expect.objectContaining({ revision: 14 }),
    expect.objectContaining({ revision: 15 }),
  ]);
});

describe('with other MongoDB context', () => {
  let mongoDBContext2: Awaited<ReturnType<typeof createMongoDBContext>>;
  let generatedId = 0;

  async function insertChange(
    { revision: targetRevision, changeset }: { revision: number; changeset: Changeset },
    options?: CreateGraphQLResolversContextOptions
  ) {
    const response = await executeOperation(
      {
        noteId: noteFixedRecords._id,
        insertRecord: {
          id: String(generatedId++),
          targetRevision,
          changeset,
          selectionInverse: Selection.ZERO,
          selection: Selection.ZERO,
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
            changeset: Changeset.parse('6:0-5,"A"'),
            revision: 6,
          },
          { user }
        ),
        insertChange(
          {
            changeset: Changeset.parse('6:0-5,"B"'),
            revision: 6,
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

      expect(mongoCollectionStats.readAndModifyCount()).lessThanOrEqual(6);

      // Database
      const dbNote = await mongoCollections.notes.findOne({
        _id: noteFixedRecords._id,
      });

      function expectOneOf<T>(values: T[]) {
        return {
          asymmetricMatch: (actual: T) => values.includes(actual),
        };
      }

      // Note
      expect(dbNote).toStrictEqual(
        expect.objectContaining({
          collabText: expect.objectContaining({
            headText: {
              changeset: expectOneOf([
                Changeset.parse('0:"abcdefAB"').serialize(),
                Changeset.parse('0:"abcdefBA"').serialize(),
              ]),
              revision: 8,
            },
            tailText: {
              changeset: expect.any(String),
              revision: 0,
            },
          }),
        })
      );

      // Check last 2 records (could be inserted in any order)
      expect([
        [
          { changeset: Changeset.parse('6:0-5,"A"').serialize(), revision: 7 },
          { changeset: Changeset.parse('7:0-6,"B"').serialize(), revision: 8 },
        ],
        [
          { changeset: Changeset.parse('6:0-5,"B"').serialize(), revision: 7 },
          { changeset: Changeset.parse('7:0-6,"A"').serialize(), revision: 8 },
        ],
      ]).toContainEqual(
        (await getCollabTextRecords(dbNote))
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
          variables: {
            input: {
              authUser: {
                id: user._id,
              },
            },
          } as any,
        },
      } as Subscription,
    ]);

    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          id: 'in-subscription',
          targetRevision: 14,
          changeset: Changeset.parse('4:0-3,". after head. published"'),
          selectionInverse: Selection.create(4),
          selection: Selection.create(26),
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
                    author: {
                      id: objectIdToStr(user._id),
                    },
                    revision: 15,
                    changeset: Changeset.parse(
                      '4:0-3,". after head. published"'
                    ).serialize(),
                    selectionInverse: Selection.create(4).serialize(),
                    selection: Selection.create(26).serialize(),
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
                    author: {
                      id: objectIdToStr(user._id),
                    },
                    revision: 15,
                    changeset: Changeset.parse(
                      '4:0-3,". after head. published"'
                    ).serialize(),
                    selectionInverse: Selection.create(4).serialize(),
                    selection: Selection.create(26).serialize(),
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
          variables: {
            input: {
              authUser: {
                id: user._id,
              },
            },
          } as any,
        },
      } as Subscription,
    ]);

    function insertSameRecord() {
      return executeOperation(
        {
          noteId: note._id,
          insertRecord: {
            id: 'in-subscription',
            targetRevision: 14,
            changeset: Changeset.parse('4:"val"'),
            selectionInverse: Selection.ZERO,
            selection: Selection.create(3),
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
          id: 'ab',
          targetRevision: 14,
          changeset: Changeset.fromText('never'),
          selectionInverse: Selection.create(0),
          selection: Selection.create(9),
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
          id: 'aa',
          targetRevision: 9, // tailText is 10
          changeset: Changeset.EMPTY,
          selectionInverse: Selection.ZERO,
          selection: Selection.create(18),
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseError(response, /too old/i);
  });

  it('throws error when new record revision is newer than headText (headText < newRecord)', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        insertRecord: {
          id: 'aa',
          targetRevision: 15, // headText is 14
          changeset: Changeset.EMPTY,
          selectionInverse: Selection.ZERO,
          selection: Selection.create(18),
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
          id: 'aa',
          targetRevision: 14,
          changeset: Changeset.parse('11:0-10," too many retained characters"'),
          selectionInverse: Selection.ZERO,
          selection: Selection.ZERO,
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
          id: 'ab',
          targetRevision: 14,
          changeset: Changeset.fromText('never'),
          selectionInverse: Selection.ZERO,
          selection: Selection.create(9),
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
          id: 'ab',
          targetRevision: 14,
          changeset: Changeset.fromText('never'),
          selectionInverse: Selection.ZERO,
          selection: Selection.create(9),
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
        id: 'ab',
        targetRevision: 14,
        changeset: Changeset.fromText('never'),
        selectionInverse: Selection.create(0),
        selection: Selection.create(9),
      },
    });

    expectGraphQLResponseError(response, /must be signed in/i);
  });
});
