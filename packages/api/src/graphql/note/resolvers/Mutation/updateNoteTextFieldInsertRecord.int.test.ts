/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, it, expect, describe, beforeAll } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangeset } from '~collab/records/record';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
  mockSubscriptionsModel,
  createMockedPublisher,
  mockSocketApi,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { mockResolver } from '../../../../__test__/helpers/graphql/mock-resolver';
import {
  expectGraphQLResponseErrorMessage,
  expectGraphQLResponseData,
} from '../../../../__test__/helpers/graphql/response';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
  createMongoDBContext,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { findNoteTextField } from '../../../../__test__/helpers/mongodb/note';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  NoteTextField,
  NoteCategory,
  UpdateNoteTextFieldInsertRecordInput,
  UpdateNoteTextFieldInsertRecordPayload,
} from '../../../types.generated';

import { updateNoteTextFieldInsertRecord } from './updateNoteTextFieldInsertRecord';

const MUTATION = `#graphql
  mutation($input: UpdateNoteTextFieldInsertRecordInput!){
    updateNoteTextFieldInsertRecord(input: $input) {
      newRecord {
        id
        creatorUserId
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
      isExistingRecord
      textField
      note {
        id
        noteId
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    noteEvents {
      events {
        __typename
        ... on NoteUpdatedEvent {
          note {
            id
            textFields {
              key
              value {
                id
                newRecord {
                  id
                  creatorUserId
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
                isExistingRecord
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
let userNoAccess: UserSchema;

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userReadOnly = fakeUserPopulateQueue();
  userNoAccess = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user, {
    collabTexts: {
      [NoteTextField.TITLE]: {
        // Random records with revisions [11,12,13,14]
        initialText: 'head',
        recordsCount: 4,
        revisionOffset: 10,
      },
      [NoteTextField.CONTENT]: {
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
    },
  });

  userAddNote(user, note, {
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
  input?: UpdateNoteTextFieldInsertRecordInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      updateNoteTextFieldInsertRecord: UpdateNoteTextFieldInsertRecordPayload;
    },
    { input?: UpdateNoteTextFieldInsertRecordInput }
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
      textField: NoteTextField.TITLE,
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
    updateNoteTextFieldInsertRecord: {
      newRecord: {
        id: `${note._id.toString('base64')}:${NoteTextField.TITLE}:15`,
        creatorUserId: expect.any(String),
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
      isExistingRecord: false,
      textField: NoteTextField.TITLE,
      note: {
        id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
        noteId: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote?.collabTexts).toStrictEqual(
    expect.arrayContaining([
      {
        k: NoteTextField.TITLE,
        v: {
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
              creatorUserId: user._id,
              changeset: [[0, 3], '. after head'],
              userGeneratedId: 'random',
              beforeSelection: {
                start: 4,
              },
              afterSelection: {
                start: 16,
              },
            },
          ]),
        },
      },
    ])
  );
});

it('inserts record on older revision (tailText < newRecord < headText)', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      textField: NoteTextField.TITLE,
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
    updateNoteTextFieldInsertRecord: {
      newRecord: {
        id: expect.any(String),
        creatorUserId: expect.any(String),
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
      isExistingRecord: false,
      textField: NoteTextField.TITLE,
      note: {
        id: expect.any(String),
        noteId: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote?.collabTexts).toStrictEqual(
    expect.arrayContaining([
      {
        k: NoteTextField.TITLE,
        v: {
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
              creatorUserId: user._id,
              changeset: [[0, 3], 'text on 12'],
              userGeneratedId: 'aa',
              beforeSelection: {
                start: 0,
              },
              afterSelection: {
                start: 14,
              },
            },
          ]),
        },
      },
    ])
  );
});

it('returns existing record when new record is a duplicate of a previous one (idempotence)', async () => {
  function insertSameRecord() {
    return executeOperation(
      {
        noteId: note._id,
        textField: NoteTextField.TITLE,
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
    updateNoteTextFieldInsertRecord: {
      newRecord: {
        id: expect.any(String),
        creatorUserId: expect.any(String),
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
      isExistingRecord: true,
      textField: NoteTextField.TITLE,
      note: {
        id: expect.any(String),
        noteId: objectIdToStr(note._id),
      },
    },
  });

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote?.collabTexts).toStrictEqual(
    expect.arrayContaining([
      {
        k: NoteTextField.TITLE,
        v: {
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
              creatorUserId: user._id,
              changeset: [[0, 3], '. after head'],
              userGeneratedId: 'will_be_dup',
              beforeSelection: {
                start: 4,
              },
              afterSelection: {
                start: 16,
              },
            },
          ]),
        },
      },
    ])
  );
});

it('api options maxRecordsCount limits records exactly when new record is composed on headText', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      textField: NoteTextField.TITLE,
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
  expect(dbNote?.collabTexts).toStrictEqual(
    expect.arrayContaining([
      {
        k: NoteTextField.TITLE,
        v: {
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
        },
      },
    ])
  );
});

it('api options maxRecordsCount keeps 1 extra record when new record is composed on older revision', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      textField: NoteTextField.TITLE,
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
  expect(dbNote?.collabTexts).toStrictEqual(
    expect.arrayContaining([
      {
        k: NoteTextField.TITLE,
        v: {
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
        },
      },
    ])
  );
});

it('handles inserting record to any string field', async () => {
  const updateNoteResolver = mockResolver(updateNoteTextFieldInsertRecord);
  await updateNoteResolver(
    {},
    {
      input: {
        noteId: note._id,
        textField: 'randomField' as NoteTextField,
        insertRecord: {
          generatedId: 'anything',
          change: {
            changeset: Changeset.fromInsertion('start'),
            revision: 1,
          },
          beforeSelection: {
            start: 0,
          },
          afterSelection: {
            start: 5,
          },
        },
      },
    },
    createGraphQLResolversContext({ user })
  );

  // Database, Note
  await expect(
    mongoCollections.notes.findOne({
      _id: note._id,
    })
  ).resolves.toEqual(
    expect.objectContaining({
      collabTexts: expect.arrayContaining([
        {
          k: 'randomField',
          v: expect.any(Object),
        },
      ]),
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
        noteId: note._id,
        textField: NoteTextField.CONTENT,
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
            mongodb: {
              client: mongoDBContext2.mongoClient,
              collections: mongoDBContext2.mongoCollections,
            },
          }
        ),
      ]);

      // Database, Note
      const dbNote = await mongoCollections.notes.findOne({
        _id: note._id,
      });

      expect(dbNote?.collabTexts).toStrictEqual(
        expect.arrayContaining([
          {
            k: NoteTextField.CONTENT,
            v: expect.objectContaining({
              headText: {
                changeset: ['abcdefAB'],
                revision: 7,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
            }),
          },
        ])
      );

      const contentField = findNoteTextField(dbNote, NoteTextField.CONTENT);
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
        contentField?.records
          .slice(6)
          .map(({ changeset, revision }) => ({ changeset, revision }))
      );
    }
  );
});

// publishes new insertion
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
        textField: NoteTextField.TITLE,
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
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${user._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${userReadOnly._id.toString(
        'base64'
      )}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

    expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteEvents: {
              events: [
                {
                  __typename: 'NoteUpdatedEvent',
                  note: {
                    id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
                    textFields: [
                      {
                        key: NoteTextField.TITLE,
                        value: {
                          id: `${note._id.toString('base64')}:${NoteTextField.TITLE}`,
                          newRecord: {
                            id: `${note._id.toString('base64')}:${
                              NoteTextField.TITLE
                            }:15`,
                            creatorUserId: expect.any(String),
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
                          isExistingRecord: false,
                        },
                      },
                    ],
                  },
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
            noteEvents: {
              events: [
                {
                  __typename: 'NoteUpdatedEvent',
                  note: {
                    id: `${note._id.toString('base64')}:${userReadOnly._id.toString(
                      'base64'
                    )}`,
                    textFields: [
                      {
                        key: NoteTextField.TITLE,
                        value: {
                          id: `${note._id.toString('base64')}:${NoteTextField.TITLE}`,
                          newRecord: {
                            id: `${note._id.toString('base64')}:${
                              NoteTextField.TITLE
                            }:15`,
                            creatorUserId: expect.any(String),
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
                          isExistingRecord: false,
                        },
                      },
                    ],
                  },
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
          textField: NoteTextField.TITLE,
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
        textField: NoteTextField.CONTENT,
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

    expectGraphQLResponseErrorMessage(response, /Note '.+' is read-only/);
  });

  it('throws error when new record revision is older than tailText (newRecord < tailText)', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        textField: NoteTextField.TITLE,
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

    expectGraphQLResponseErrorMessage(response, /.*revision is old.*/i);
  });

  it('throws error when new record revision is newer than headText (headText < newRecord)', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        textField: NoteTextField.TITLE,
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

    expectGraphQLResponseErrorMessage(response, /.*invalid revision.*/i);
  });

  it('throws error when record changeset cannot be composed on headText', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        textField: NoteTextField.TITLE,
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

    expectGraphQLResponseErrorMessage(response, /.*invalid changeset.*/i);
  });

  it('throws note not found if noteId is invalid', async () => {
    const response = await executeOperation(
      {
        noteId: new ObjectId(),
        textField: NoteTextField.CONTENT,
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

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        textField: NoteTextField.CONTENT,
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

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      noteId: note._id,
      textField: NoteTextField.CONTENT,
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

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});
