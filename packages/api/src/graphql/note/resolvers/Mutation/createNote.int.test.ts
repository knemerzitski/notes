/* eslint-disable @typescript-eslint/unbound-method */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';

import { Changeset } from '~collab/changeset/changeset';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
  createMockedPublisher,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../__test__/helpers/graphql/response';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  CreateNoteInput,
  CreateNotePayload,
  NoteCategory,
  NoteTextField,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

const MUTATION_ALL = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      userNoteLink {
        id
        categoryName
        preferences {
          backgroundColor
        }
        public {
          id
          createdAt
          readOnly
        }
      }
      note {
        id
        shareAccess {
          id
        }
        collab {
          textFields {
            key
            value {
              headText {
                revision
                changeset
              }
              tailText {
                revision
                changeset
              }
              recordConnection(last: 2) {
                records {
                  creatorUser {
                    id
                  }
                  change {
                    changeset
                    revision
                  }
                  beforeSelection {
                    start
                    end
                  }
                  afterSelection {
                    start
                    end
                  }
                  createdAt
                }
              }
            }
        }
        }
      }
    }
  }
`;

const MUTATION_MINIMAL_TEXTFIELDS = `#graphql
  mutation($input: CreateNoteInput!){
    createNote(input: $input) {
      note {
        collab {
          textFields(name: CONTENT) {
            key
            value {
              headText {
                revision
              }
            }
          }
        }
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription {
    signedInUserEvents {
      mutations {
        ... on CreateNotePayload {
          note {
            id
            collab {
              textFields {
                key
                value {
                  headText {
                    changeset
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

async function executeOperation(
  input?: CreateNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION_ALL
) {
  return await apolloServer.executeOperation<
    {
      createNote: CreateNotePayload;
    },
    { input?: CreateNoteInput }
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

let user: UserSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  user = fakeUserPopulateQueue();
});

describe('no existing notes', () => {
  beforeEach(async () => {
    await populateExecuteAll();
    mongoCollectionStats.mockClear();
  });

  it('creates note without specifying any input', async () => {
    const response = await executeOperation({}, { user });

    const data = expectGraphQLResponseData(response);
    expect(data).toEqual({
      createNote: {
        userNoteLink: {
          id: expect.any(String),
          categoryName: NoteCategory.DEFAULT,
          preferences: {
            backgroundColor: null,
          },
          public: {
            id: expect.any(String),
            createdAt: expect.any(Date),
            readOnly: false,
          },
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collab: {
            textFields: Object.values(NoteTextField).map((fieldName) => ({
              key: fieldName,
              value: {
                headText: {
                  changeset: Changeset.EMPTY.serialize(),
                  revision: 0,
                },
                tailText: {
                  changeset: Changeset.EMPTY.serialize(),
                  revision: 0,
                },
                recordConnection: {
                  records: [],
                },
              },
            })),
          },
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.DEFAULT]: {
              order: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.notes.category[NoteCategory.DEFAULT]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      users: [
        {
          _id: user._id,
          categoryName: NoteCategory.DEFAULT,
          createdAt: expect.any(Date),
        },
      ],
    });
  });

  it('creates note with all inputs', async () => {
    const response = await executeOperation(
      {
        userNoteLink: {
          categoryName: NoteCategory.ARCHIVE,
          preferences: {
            backgroundColor: '#cacc52',
          },
        },
        collab: {
          textFields: [
            {
              key: NoteTextField.TITLE,
              value: {
                initialText: 'initial title',
              },
            },
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'initial content',
              },
            },
          ],
        },
      },
      { user }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      createNote: {
        userNoteLink: {
          id: expect.any(String),
          categoryName: NoteCategory.ARCHIVE,
          preferences: {
            backgroundColor: '#cacc52',
          },
          public: {
            id: expect.any(String),
            createdAt: expect.any(Date),
            readOnly: false,
          },
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collab: {
            textFields: expect.arrayContaining([
              {
                key: NoteTextField.CONTENT,
                value: {
                  headText: {
                    changeset: Changeset.fromInsertion('initial content').serialize(),
                    revision: 1,
                  },
                  tailText: {
                    changeset: Changeset.EMPTY.serialize(),
                    revision: 0,
                  },
                  recordConnection: {
                    records: [
                      {
                        creatorUser: {
                          id: expect.any(String),
                        },
                        change: {
                          changeset:
                            Changeset.fromInsertion('initial content').serialize(),
                          revision: 1,
                        },
                        beforeSelection: {
                          start: 0,
                          end: null,
                        },
                        afterSelection: {
                          start: 15,
                          end: null,
                        },
                        createdAt: expect.any(Date),
                      },
                    ],
                  },
                },
              },
              {
                key: NoteTextField.TITLE,
                value: {
                  headText: {
                    changeset: Changeset.fromInsertion('initial title').serialize(),
                    revision: 1,
                  },
                  tailText: {
                    changeset: Changeset.EMPTY.serialize(),
                    revision: 0,
                  },
                  recordConnection: {
                    records: [
                      {
                        creatorUser: {
                          id: expect.any(String),
                        },
                        change: {
                          changeset: Changeset.fromInsertion('initial title').serialize(),
                          revision: 1,
                        },
                        beforeSelection: {
                          start: 0,
                          end: null,
                        },
                        afterSelection: {
                          start: 13,
                          end: null,
                        },
                        createdAt: expect.any(Date),
                      },
                    ],
                  },
                },
              },
            ]),
          },
        },
      },
    });
    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.ARCHIVE]: {
              order: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.notes.category[NoteCategory.ARCHIVE]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      users: [
        {
          _id: user._id,
          categoryName: NoteCategory.ARCHIVE,
          createdAt: expect.any(Date),
          preferences: {
            backgroundColor: '#cacc52',
          },
        },
      ],
      collab: {
        updatedAt: expect.any(Date),
        texts: expect.arrayContaining([
          {
            k: NoteTextField.TITLE,
            v: {
              headText: {
                changeset: Changeset.fromInsertion('initial title').serialize(),
                revision: 1,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              records: [
                {
                  changeset: Changeset.fromInsertion('initial title').serialize(),
                  revision: 1,
                  creatorUserId: user._id,
                  userGeneratedId: expect.any(String),
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 13,
                  },
                  createdAt: expect.any(Date),
                },
              ],
            },
          },
          {
            k: NoteTextField.CONTENT,
            v: {
              headText: {
                changeset: Changeset.fromInsertion('initial content').serialize(),
                revision: 1,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              records: [
                {
                  changeset: Changeset.fromInsertion('initial content').serialize(),
                  revision: 1,
                  creatorUserId: user._id,
                  userGeneratedId: expect.any(String),
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 15,
                  },
                  createdAt: expect.any(Date),
                },
              ],
            },
          },
        ]),
      },
    });
  });

  it('ignores duplicate textFields entries', async () => {
    const response = await executeOperation(
      {
        collab: {
          textFields: [
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'a',
              },
            },
            {
              key: NoteTextField.CONTENT,
              value: {
                initialText: 'b',
              },
            },
          ],
        },
      },
      { user },
      MUTATION_MINIMAL_TEXTFIELDS
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      createNote: {
        note: {
          collab: {
            textFields: expect.arrayContaining([
              {
                key: NoteTextField.CONTENT,
                value: {
                  headText: {
                    revision: 1,
                  },
                },
              },
            ]),
          },
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    const noteId = dbUser?.notes.category[NoteCategory.DEFAULT]?.order[0];
    assert(noteId != null);

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: noteId,
    });
    expect(dbNote).toStrictEqual({
      _id: noteId,
      users: [
        {
          _id: user._id,
          categoryName: NoteCategory.DEFAULT,
          createdAt: expect.any(Date),
        },
      ],
      collab: {
        updatedAt: expect.any(Date),
        texts: expect.arrayContaining([
          {
            k: NoteTextField.CONTENT,
            v: {
              headText: {
                changeset: Changeset.fromInsertion('a').serialize(),
                revision: 1,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              records: [
                {
                  changeset: Changeset.fromInsertion('a').serialize(),
                  revision: 1,
                  creatorUserId: user._id,
                  userGeneratedId: expect.any(String),
                  beforeSelection: {
                    start: 0,
                  },
                  afterSelection: {
                    start: 1,
                  },
                  createdAt: expect.any(Date),
                },
              ],
            },
          },
        ]),
      },
    });
  });

  describe('errors', () => {
    it('throws error if not authenticated', async () => {
      const response = await executeOperation({}, { user: undefined });
      expectGraphQLResponseError(response, /.*must be signed in.*/);

      // Database not modified
      const dbUser = await mongoCollections.users.findOne({
        _id: user._id,
      });
      expect(dbUser, 'Expected User collection to be unmodified').toStrictEqual(
        expect.objectContaining({
          notes: {
            category: {},
          },
        })
      );
      const dbNote = await mongoCollections.notes.find().toArray();
      expect(dbNote, 'Expected Note collection to be unmodified').toStrictEqual([]);
    });

    it('throws error if input text is too large', async () => {
      const response = await executeOperation(
        {
          collab: {
            textFields: [
              {
                key: NoteTextField.CONTENT,
                value: {
                  initialText: 'a'.repeat(100001),
                },
              },
            ],
          },
        },
        { user }
      );
      expectGraphQLResponseError(response, /got invalid value/);
    });
  });

  describe('spyOn ObjectId', () => {
    let spyObjectIdGenerate: MockInstance<[time?: number | undefined], Uint8Array>;

    beforeAll(() => {
      spyObjectIdGenerate = vi.spyOn(ObjectId, 'generate');
    });

    afterEach(() => {
      spyObjectIdGenerate.mockReset();
    });

    afterAll(() => {
      spyObjectIdGenerate.mockRestore();
    });

    it('handles duplicate ObjectId by rerunning the resolver', async () => {
      spyObjectIdGenerate.mockImplementationOnce(() => {
        return new Uint8Array(1);
      });
      expectGraphQLResponseData(await executeOperation({}, { user }));

      expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

      // ObjectId will now be a duplicate
      spyObjectIdGenerate.mockImplementationOnce(() => {
        return new Uint8Array(1);
      });
      expectGraphQLResponseData(await executeOperation({}, { user }));

      expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(5);
    });
  });

  describe('subscription', () => {
    it('publishes created note to current user', async () => {
      mockSubscriptionsModel.queryAllByTopic.mockResolvedValue([
        {
          subscription: {
            query: SUBSCRIPTION,
          },
        } as Subscription,
      ]);

      const response = await executeOperation(
        {
          collab: {
            textFields: [
              {
                key: NoteTextField.CONTENT,
                value: {
                  initialText: 'content',
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
        signedInUserTopic(user._id)
      );
      expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

      expect(mockSocketApi.post).toHaveBeenLastCalledWith({
        message: expect.objectContaining({
          type: 'next',
          payload: {
            data: {
              signedInUserEvents: {
                mutations: [
                  {
                    note: {
                      id: expect.any(String),
                      collab: {
                        textFields: expect.arrayContaining([
                          {
                            key: NoteTextField.CONTENT,
                            value: {
                              headText: {
                                changeset: Changeset.fromInsertion('content').serialize(),
                              },
                            },
                          },
                          {
                            key: NoteTextField.TITLE,
                            value: {
                              headText: { changeset: Changeset.EMPTY.serialize() },
                            },
                          },
                        ]),
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      });
      expect(mockSocketApi.post).toBeCalledTimes(1);
    });
  });
});

describe('have existing note', () => {
  let existingNote: NoteSchema;
  beforeEach(async () => {
    existingNote = fakeNotePopulateQueue(user);

    userAddNote(user, existingNote, {
      override: {
        categoryName: NoteCategory.DEFAULT,
      },
    });

    await populateExecuteAll();

    mongoCollectionStats.mockClear();
  });

  it('pushes new note to end of array', async () => {
    const response = await executeOperation({}, { user });
    expectGraphQLResponseData(response);

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser, 'Note was not pushed to end of "order" array').toStrictEqual(
      expect.objectContaining({
        notes: {
          category: {
            [NoteCategory.DEFAULT]: {
              order: [existingNote._id, expect.any(ObjectId)],
            },
          },
        },
      })
    );
  });
});
