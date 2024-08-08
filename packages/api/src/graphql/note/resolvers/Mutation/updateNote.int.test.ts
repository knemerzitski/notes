/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangeset } from '~collab/records/record';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createMockedPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { mockResolver } from '../../../../__test__/helpers/graphql/mock-resolver';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseErrorMessage,
} from '../../../../__test__/helpers/graphql/response';
import {
  createMongoDBContext,
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  findNoteTextField, findNoteUserNote
} from '../../../../__test__/helpers/mongodb/note';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import {
  populateNotes,
  userAddNote,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  NoteCategory,
  NoteTextField,
  UpdateNoteInput,
  UpdateNotePayload,
} from '../../../types.generated';

import { updateNote } from './updateNote';

const MUTATION_ALL = `#graphql
  mutation($input: UpdateNoteInput!){
    updateNote(input: $input) {
      contentId
      patch {
        id
        sharing {
          id
          deleted
        }
        categoryName
        preferences {
          backgroundColor
        }
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
`;

const SUBSCRIPTION = `#graphql
  subscription {
    noteUpdated {
      contentId
      patch {
        id
        sharing {
          id
          deleted
        }
        preferences {
          backgroundColor
        }
        categoryName
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

  populateNotes(2, {
    user,
    userNote(noteIndex) {
      return {
        override: {
          categoryName: noteIndex % 2 == 0 ? NoteCategory.DEFAULT : NoteCategory.ARCHIVE,
        },
      };
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
  userAddNote(user, note);

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input?: UpdateNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION_ALL
) {
  return await apolloServer.executeOperation<
    {
      updateNote: UpdateNotePayload;
    },
    { input?: UpdateNoteInput }
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

describe('category', () => {
  it('changes category', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          categoryName: NoteCategory.ARCHIVE,
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: NoteCategory.ARCHIVE,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [NoteCategory.ARCHIVE]: {
              order: [expect.any(ObjectId), note._id],
            },
            [NoteCategory.DEFAULT]: {
              order: [expect.any(ObjectId)],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbUserNote = findNoteUserNote(user._id, dbNote);
    expect(dbUserNote?.categoryName, 'Category was not updated in Note').toStrictEqual(
      NoteCategory.ARCHIVE
    );
  });

  it('changes category for user with read-only access', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          categoryName: NoteCategory.ARCHIVE,
        },
      },
      {
        user: userReadOnly,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: NoteCategory.ARCHIVE,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: userReadOnly._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: userReadOnly._id,
        notes: {
          category: {
            [NoteCategory.ARCHIVE]: {
              order: [note._id],
            },
            [NoteCategory.DEFAULT]: {
              order: [],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbUserNote = findNoteUserNote(userReadOnly._id, dbNote);
    expect(dbUserNote?.categoryName, 'Category was not updated in Note').toStrictEqual(
      NoteCategory.ARCHIVE
    );
  });

  it('publishes category only to current user', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as Subscription,
    ]);
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          categoryName: NoteCategory.ARCHIVE,
        },
      },
      {
        user,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
      `${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${user._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

    expect(mockSocketApi.post).toHaveBeenLastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteUpdated: {
              contentId: expect.any(String),
              patch: {
                id: expect.any(String),
                categoryName: NoteCategory.ARCHIVE,
                sharing: null,
                preferences: {
                  backgroundColor: null,
                },
                textFields: null,
              },
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(1);
  });

  it('can set category to any string without GraphQL validation', async () => {
    const updateNoteResolver = mockResolver(updateNote);
    await updateNoteResolver(
      {},
      {
        input: {
          contentId: note.publicId,
          patch: {
            categoryName: 'randomCategory' as NoteCategory,
          },
        },
      },
      createGraphQLResolversContext({ user })
    );

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [NoteCategory.ARCHIVE]: {
              order: [expect.any(ObjectId)],
            },
            [NoteCategory.DEFAULT]: {
              order: [expect.any(ObjectId)],
            },
            randomCategory: {
              order: [note._id],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbUserNote = findNoteUserNote(user._id, dbNote);
    expect(dbUserNote?.categoryName, 'Category was not updated in Note').toStrictEqual(
      'randomCategory'
    );
  });
});

describe('backgroundColor', () => {
  it('changes backgroundColor', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          preferences: {
            backgroundColor: '#ffffff',
          },
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: null,
          preferences: {
            backgroundColor: '#ffffff',
          },
          sharing: null,
          textFields: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbUserNote = findNoteUserNote(user._id, dbNote);
    expect(
      dbUserNote?.preferences?.backgroundColor,
      'Background clor was not updated in Note'
    ).toStrictEqual(dbUserNote?.preferences?.backgroundColor);
  });

  it('changes backgroundColor for user with read-only access', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          preferences: {
            backgroundColor: '#ffffff',
          },
        },
      },
      {
        user: userReadOnly,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: null,
          preferences: {
            backgroundColor: '#ffffff',
          },
          sharing: null,
          textFields: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbUserNote = findNoteUserNote(userReadOnly._id, dbNote);
    expect(
      dbUserNote?.preferences?.backgroundColor,
      'Category was not updated in Note'
    ).toStrictEqual('#ffffff');
  });

  it('publishes backgroundColor only to current user', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
      {
        subscription: {
          query: SUBSCRIPTION,
        },
      } as Subscription,
    ]);

    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          preferences: {
            backgroundColor: '#ffffff',
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
      `${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${user._id.toString('base64')}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

    expect(mockSocketApi.post).toHaveBeenLastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteUpdated: {
              contentId: expect.any(String),
              patch: {
                id: expect.any(String),
                categoryName: null,
                sharing: null,
                preferences: {
                  backgroundColor: '#ffffff',
                },
                textFields: null,
              },
            },
          },
        },
      }),
    });
    expect(mockSocketApi.post).toBeCalledTimes(1);
  });
});

describe('errors', () => {
  it('throws note not found if contentId is invalid', async () => {
    const response = await executeOperation(
      {
        contentId: 'never',
      },
      { user }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws note not found if user is not linked to the note', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
      },
      { user: userNoAccess }
    );

    expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
  });

  it('throws error if not authenticated', async () => {
    const response = await executeOperation({
      contentId: note.publicId,
    });

    expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
  });
});

describe('collabTexts insertRecord', () => {
  it('throws error if attempting to add record with read-only access', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.CONTENT,
              value: {
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
            },
          ],
        },
      },
      { user: userReadOnly }
    );

    expectGraphQLResponseErrorMessage(response, /Note is read-only/);
  });

  it('inserts record on headText revision (newRecord = headText)', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
          categoryName: null,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                id: `${note._id.toString('base64')}:${NoteTextField.TITLE}`,
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
              },
            },
          ],
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

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
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: null,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                id: expect.any(String),
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
              },
            },
          ],
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

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

  it('throws error when new record revision is older than tailText (newRecord < tailText)', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
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
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseErrorMessage(response, /.*invalid revision.*/i);
  });

  it('ignores duplicate field keys on new record insertion', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                insertRecord: {
                  generatedId: 'random',
                  change: {
                    revision: 14,
                    changeset: Changeset.fromInsertion('a'),
                  },
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 1,
                  },
                },
              },
            },
            {
              key: NoteTextField.TITLE,
              value: {
                insertRecord: {
                  generatedId: 'random2',
                  change: {
                    revision: 14,
                    changeset: Changeset.fromInsertion('a'),
                  },
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 1,
                  },
                },
              },
            },
          ],
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    expect(data).toEqual({
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: null,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                id: expect.any(String),
                newRecord: {
                  id: expect.any(String),
                  creatorUserId: expect.any(String),
                  change: {
                    revision: 15,
                    changeset: ['a'],
                  },
                  beforeSelection: {
                    start: 0,
                    end: 0,
                  },
                  afterSelection: {
                    start: 1,
                    end: 1,
                  },
                },
                isExistingRecord: false,
              },
            },
          ],
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

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
              changeset: ['a'],
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
                changeset: ['a'],
                userGeneratedId: 'random',
                beforeSelection: {
                  start: 0,
                },
                afterSelection: {
                  start: 1,
                },
              },
            ]),
          },
        },
      ])
    );
  });

  it('throws error when record changeset cannot be composed on headText', async () => {
    const response = await executeOperation(
      {
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                insertRecord: {
                  generatedId: 'aa',
                  change: {
                    revision: 14,
                    changeset: Changeset.parseValue([
                      [0, 10],
                      ' too many retained characters',
                    ]),
                  },
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 0,
                  },
                },
              },
            },
          ],
        },
      },
      {
        user,
      }
    );

    expectGraphQLResponseErrorMessage(response, /.*invalid changeset.*/i);
  });

  it('returns existing record when new record is a duplicate of a previous one (idempotence)', async () => {
    function insertSameRecord() {
      return executeOperation(
        {
          contentId: note.publicId,
          patch: {
            textFields: [
              {
                key: NoteTextField.TITLE,
                value: {
                  insertRecord: {
                    generatedId: 'will_be_duplicate',
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
              },
            ],
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
      updateNote: {
        contentId: note.publicId,
        patch: {
          id: expect.any(String),
          categoryName: null,
          preferences: {
            backgroundColor: null,
          },
          sharing: null,
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                id: expect.any(String),
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
              },
            },
          ],
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
                userGeneratedId: 'will_be_duplicate',
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
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
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
        contentId: note.publicId,
        patch: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
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
            },
          ],
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
    const updateNoteResolver = mockResolver(updateNote);
    await updateNoteResolver(
      {},
      {
        input: {
          contentId: note.publicId,
          patch: {
            textFields: [
              {
                key: 'randomField' as NoteTextField,
                value: {
                  insertRecord: {
                    generatedId: 'anything',
                    change: {
                      // sets revision 1 and ignores retained characters
                      // ignores gen id too..
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
            ],
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
          contentId: note.publicId,
          patch: {
            textFields: [
              {
                key: NoteTextField.CONTENT,
                value: {
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
              },
            ],
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
          contentId: note.publicId,
          patch: {
            textFields: [
              {
                key: NoteTextField.TITLE,
                value: {
                  insertRecord: {
                    generatedId: 'in-subscription',
                    change: {
                      revision: 14,
                      changeset: Changeset.parseValue([
                        [0, 3],
                        '. after head. published',
                      ]),
                    },
                    beforeSelection: {
                      start: 4,
                    },
                    afterSelection: {
                      start: 26,
                    },
                  },
                },
              },
            ],
          },
        },
        {
          user,
          createPublisher: createMockedPublisher,
        }
      );
      expectGraphQLResponseData(response);

      expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
        `${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${user._id.toString('base64')}`
      );
      expect(mockSubscriptionsModel.queryAllByTopic).toHaveBeenCalledWith(
        `${SubscriptionTopicPrefix.NOTE_UPDATED}:userId=${userReadOnly._id.toString(
          'base64'
        )}`
      );
      expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(2);

      expect(mockSocketApi.post).toHaveBeenNthCalledWith(1, {
        message: expect.objectContaining({
          type: 'next',
          payload: {
            data: {
              noteUpdated: {
                contentId: note.publicId,
                patch: {
                  id: `${note._id.toString('base64')}:${user._id.toString('base64')}`,
                  categoryName: null,
                  sharing: null,
                  preferences: {
                    backgroundColor: null,
                  },
                  textFields: [
                    {
                      key: NoteTextField.TITLE,
                      value: {
                        id: `${note._id.toString('base64')}:${NoteTextField.TITLE}`,
                        newRecord: {
                          id: `${note._id.toString('base64')}:${NoteTextField.TITLE}:15`,
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
            },
          },
        }),
      });
      expect(mockSocketApi.post).toHaveBeenNthCalledWith(2, {
        message: expect.objectContaining({
          type: 'next',
          payload: {
            data: {
              noteUpdated: {
                contentId: note.publicId,
                patch: {
                  id: `${note._id.toString('base64')}:${userReadOnly._id.toString(
                    'base64'
                  )}`,
                  categoryName: null,
                  sharing: null,
                  preferences: {
                    backgroundColor: null,
                  },
                  textFields: [
                    {
                      key: NoteTextField.TITLE,
                      value: {
                        id: `${note._id.toString('base64')}:${NoteTextField.TITLE}`,
                        newRecord: {
                          id: `${note._id.toString('base64')}:${NoteTextField.TITLE}:15`,
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
            contentId: note.publicId,
            patch: {
              textFields: [
                {
                  key: NoteTextField.TITLE,
                  value: {
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
                },
              ],
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

  /*
  - add patch fields filled...
  */
});

it('handles all patch inputs at once', async () => {
  const response = await executeOperation(
    {
      contentId: note.publicId,
      patch: {
        categoryName: NoteCategory.ARCHIVE,
        preferences: {
          backgroundColor: '#ffffff',
        },
        textFields: [
          {
            key: NoteTextField.TITLE,
            value: {
              insertRecord: {
                generatedId: 'random',
                change: {
                  revision: 14,
                  changeset: Changeset.fromInsertion('new'),
                },
                beforeSelection: {
                  start: 4,
                },
                afterSelection: {
                  start: 16,
                },
              },
            },
          },
        ],
      },
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);

  expect(data).toEqual({
    updateNote: {
      contentId: note.publicId,
      patch: {
        id: expect.any(String),
        categoryName: NoteCategory.ARCHIVE,
        preferences: {
          backgroundColor: '#ffffff',
        },
        sharing: null,
        textFields: [
          {
            key: NoteTextField.TITLE,
            value: {
              id: expect.any(String),
              newRecord: {
                id: expect.any(String),
                creatorUserId: expect.any(String),
                change: {
                  revision: 15,
                  changeset: ['new'],
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
            },
          },
        ],
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      userNotes: expect.arrayContaining([
        {
          userId: user._id,
          categoryName: NoteCategory.ARCHIVE,
          readOnly: false,
          preferences: {
            backgroundColor: '#ffffff',
          },
        },
      ]),
      collabTexts: expect.arrayContaining([
        {
          k: NoteTextField.TITLE,
          v: {
            headText: {
              changeset: ['new'],
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
                changeset: ['new'],
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
      ]),
    })
  );
});
