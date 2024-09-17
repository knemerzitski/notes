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

import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
  createMockedPublisher,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__test__/helpers/graphql/response';
import {
  mongoCollections,
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
  CreateNoteInput,
  CreateNotePayload,
  NoteCategory,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';

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
          isOwner
          readOnly
        }
      }
      note {
        id
        shareAccess {
          id
        }
        collab {
          text {
            headText {
              revision
              changeset
            }
            tailText {
              revision
              changeset
            }
            recordConnection {
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
`;

const SUBSCRIPTION = `#graphql
  subscription {
    signedInUserEvents {
      mutations {
        ... on CreateNotePayload {
          note {
            id
            collab {
              text {
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

let user: DBUserSchema;

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
            isOwner: true,
            readOnly: false,
          },
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collab: {
            text: {
              headText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 1,
              },
              tailText: {
                changeset: Changeset.EMPTY.serialize(),
                revision: 0,
              },
              recordConnection: {
                records: [
                  {
                    afterSelection: {
                      start: 0,
                      end: null,
                    },
                    beforeSelection: {
                      start: 0,
                      end: null,
                    },
                    change: {
                      changeset: Changeset.EMPTY.serialize(),
                      revision: 1,
                    },
                    createdAt: expect.any(Date),
                    creatorUser: {
                      id: objectIdToStr(user._id),
                    },
                  },
                ],
              },
            },
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
        note: {
          categories: {
            [NoteCategory.DEFAULT]: {
              noteIds: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.note.categories[NoteCategory.DEFAULT]?.noteIds[0];
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
          isOwner: true,
          createdAt: expect.any(Date),
        },
      ],
      collabText: {
        updatedAt: expect.any(Date),
        headText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 1,
        },
        tailText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 0,
        },
        records: [
          {
            changeset: Changeset.EMPTY.serialize(),
            revision: 1,
            creatorUser: {
              _id: user._id,
            },
            userGeneratedId: expect.any(String),
            beforeSelection: {
              start: 0,
            },
            afterSelection: {
              start: 0,
            },
            createdAt: expect.any(Date),
          },
        ],
      },
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
          text: {
            initialText: 'initial content',
          },
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
            isOwner: true,
            readOnly: false,
          },
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collab: {
            text: {
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
                      changeset: Changeset.fromInsertion('initial content').serialize(),
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
        note: {
          categories: {
            [NoteCategory.ARCHIVE]: {
              noteIds: [expect.any(ObjectId)],
            },
          },
        },
      })
    );
    const noteId = dbUser?.note.categories[NoteCategory.ARCHIVE]?.noteIds[0];
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
          isOwner: true,
          createdAt: expect.any(Date),
          preferences: {
            backgroundColor: '#cacc52',
          },
        },
      ],
      collabText: {
        updatedAt: expect.any(Date),
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
            creatorUser: {
              _id: user._id,
            },
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
          note: {
            categories: {},
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
            text: {
              initialText: 'a'.repeat(100001),
            },
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
            text: {
              initialText: 'content',
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
                        text: {
                          headText: {
                            changeset: Changeset.fromInsertion('content').serialize(),
                          },
                        },
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
  let existingNote: DBNoteSchema;
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
    expect(dbUser, 'Note was not pushed to end of "noteIds" array').toStrictEqual(
      expect.objectContaining({
        note: {
          categories: {
            [NoteCategory.DEFAULT]: {
              noteIds: [existingNote._id, expect.any(ObjectId)],
            },
          },
        },
      })
    );
  });
});
