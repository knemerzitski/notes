/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

import { Subscription } from '../../../../../../../lambda-graphql/src/dynamodb/models/subscription';

import { Changeset, Selection } from '../../../../../../../collab2/src';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
  createMockedPublisher,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__tests__/helpers/graphql/response';
import {
  mongoCollections,
  resetDatabase,
  mongoCollectionStats,
} from '../../../../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import {
  CreateNoteInput,
  CreateNotePayload,
  NoteCategory,
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
        isOwner
        readOnly
      }
      note {
        id
        shareAccess {
          id
        }
        collabText {
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
              author {
                id
              }
              change {
                changeset
                revision
              }
              selectionInverse
              selection
              createdAt
            }
          }
        }
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        ... on CreateNotePayload {
          note {
            id
            collabText {
              headText {
                changeset
              }
            }
          }
        }
      }
    }
  }
`;

async function executeOperation(
  input?: Omit<CreateNoteInput, 'authUser'>,
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
        input: {
          ...input,
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
          isOwner: true,
          readOnly: false,
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collabText: {
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
    });

    // No records were inserted
    expect(await mongoCollections.collabRecords.find().toArray()).toHaveLength(0);
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
        collabText: {
          initialText: 'initial content',
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
          isOwner: true,
          readOnly: false,
        },
        note: {
          id: expect.any(String),
          shareAccess: null,
          collabText: {
            headText: {
              changeset: Changeset.fromText('initial content').serialize(),
              revision: 1,
            },
            tailText: {
              changeset: Changeset.EMPTY.serialize(),
              revision: 0,
            },
            recordConnection: {
              records: [
                {
                  author: {
                    id: expect.any(String),
                  },
                  change: {
                    changeset: Changeset.fromText('initial content').serialize(),
                    revision: 1,
                  },
                  selectionInverse: Selection.create(0).serialize(),
                  selection: Selection.create(15).serialize(),
                  createdAt: expect.any(Date),
                },
              ],
            },
          },
        },
      },
    });
    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

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
          changeset: Changeset.fromText('initial content').serialize(),
          revision: 1,
        },
        tailText: {
          changeset: Changeset.EMPTY.serialize(),
          revision: 0,
        },
      },
    });

    const dbCollabRecords = await mongoCollections.collabRecords.find().toArray();
    expect(dbCollabRecords).toStrictEqual([
      {
        _id: expect.any(ObjectId),
        collabTextId: dbNote?._id,
        changeset: Changeset.fromText('initial content').serialize(),
        inverse: Changeset.create(15, []).serialize(),
        revision: 1,
        authorId: user._id,
        idempotencyId: expect.any(String),
        selectionInverse: Selection.create(0).serialize(),
        selection: Selection.create(15).serialize(),
        createdAt: expect.any(Date),
      },
    ]);
  });

  describe('errors', () => {
    it('throws error if not authenticated', async () => {
      const response = await executeOperation({}, { user: undefined });
      expectGraphQLResponseError(response, /must be signed in/i);

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
          collabText: {
            initialText: 'a'.repeat(100001),
          },
        },
        { user }
      );
      expectGraphQLResponseError(response, /got invalid value/i);
    });
  });

  describe('spyOn ObjectId', () => {
    let spyObjectIdGenerate: MockInstance<(time?: number) => Uint8Array>;

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
          collabText: {
            initialText: 'content',
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
                      collabText: {
                        headText: {
                          changeset: Changeset.fromText('content').serialize(),
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
    ({ note: existingNote } = fakeNotePopulateQueue(user));

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
