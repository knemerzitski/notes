/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

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
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { findNoteUser } from '../../../../__test__/helpers/mongodb/note';
import { fakeNotePopulateQueue } from '../../../../__test__/helpers/mongodb/populate/note';
import {
  populateNotes,
  userAddNote,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { SubscriptionTopicPrefix } from '../../../subscriptions';
import {
  ListAnchorPosition,
  MoveNoteInput,
  MoveNotePayload,
  MovableNoteCategory,
  NoteCategory,
} from '../../../types.generated';

import { moveNote } from './moveNote';

const MUTATION = `#graphql
  mutation($input: MoveNoteInput!){
    moveNote(input: $input) {
      location {
        categoryName
        anchorNote {
          id
        }
        anchorPosition
      }
      note {
        id
        noteId
        categoryName
        deletedAt
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
            location {
              categoryName
              anchorNote {
                id
              }
              anchorPosition  
            }
            categoryName
            deletedAt
          }
        }
      }
    }    
  }
`;

let user: UserSchema;
let userNotOwner: UserSchema;
let note: NoteSchema;
let userBaseDefaultNoteIds: ObjectId[];
let userBaseArchiveNoteIds: ObjectId[];

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userNotOwner = fakeUserPopulateQueue();

  note = fakeNotePopulateQueue(user);

  const populateResult = populateNotes(6, {
    user,
    noteUser(noteIndex) {
      return {
        override: {
          categoryName:
            noteIndex % 2 === 0
              ? MovableNoteCategory.DEFAULT
              : MovableNoteCategory.ARCHIVE,
        },
      };
    },
  });
  userBaseDefaultNoteIds = populateResult.data
    .filter((_, index) => index % 2 === 0)
    .map((data) => data.note._id);
  userBaseArchiveNoteIds = populateResult.data
    .filter((_, index) => index % 2 !== 0)
    .map((data) => data.note._id);
});

async function executeOperation(
  input?: MoveNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      moveNote: MoveNotePayload;
    },
    { input?: MoveNoteInput }
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

// TODO test without categoryname, also move out of trash..

describe('note in normal categories', () => {
  let userNoAccess: UserSchema;

  beforeEach(async () => {
    userNoAccess = fakeUserPopulateQueue();

    userAddNote(user, note, {
      override: {
        readOnly: false,
        categoryName: MovableNoteCategory.DEFAULT,
      },
    });
    userAddNote(userNotOwner, note, {
      override: {
        readOnly: true,
        categoryName: MovableNoteCategory.DEFAULT,
      },
    });

    await populateExecuteAll();

    mongoCollectionStats.mockClear();
  });

  it('moves note to another category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(userBaseArchiveNoteIds.at(-1))}:${objectIdToStr(
              user._id
            )}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [MovableNoteCategory.ARCHIVE]: {
              order: [...userBaseArchiveNoteIds, note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      MovableNoteCategory.ARCHIVE
    );
  });

  it('moves note before specific anchor note to another category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          // Before middle note, so note will be second one in list
          anchorNoteId: userBaseArchiveNoteIds[1],
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorNote: {
            id: `${objectIdToStr(userBaseArchiveNoteIds[1])}:${objectIdToStr(user._id)}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [MovableNoteCategory.ARCHIVE]: {
              order: [
                ...userBaseArchiveNoteIds.slice(0, 1),
                note._id,
                ...userBaseArchiveNoteIds.slice(1),
              ],
            },
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      MovableNoteCategory.ARCHIVE
    );
  });

  it('moves note before specific anchor note in same category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNoteId: userBaseDefaultNoteIds[0],
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(userBaseDefaultNoteIds[0])}:${objectIdToStr(user._id)}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
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
            [MovableNoteCategory.ARCHIVE]: {
              order: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              order: [
                ...userBaseDefaultNoteIds.slice(0, 1),
                note._id,
                ...userBaseDefaultNoteIds.slice(1),
              ],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.DEFAULT);
  });

  it('moves note to end of category if anchor note is invalid in another category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorNoteId: new ObjectId(),
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(userBaseArchiveNoteIds.at(-1))}:${objectIdToStr(
              user._id
            )}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [MovableNoteCategory.ARCHIVE]: {
              order: [...userBaseArchiveNoteIds, note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.ARCHIVE);
  });

  it('moves note to end of category if anchor note is invalid in same category', async () => {
    const response = await executeOperation(
      {
        noteId: userBaseDefaultNoteIds[0]!,
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorNoteId: new ObjectId(),
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          },
        },
        note: {
          id: `${objectIdToStr(userBaseDefaultNoteIds[0])}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(userBaseDefaultNoteIds[0]),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
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
            [MovableNoteCategory.ARCHIVE]: {
              order: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              order: [
                ...userBaseDefaultNoteIds.slice(1),
                note._id,
                ...userBaseDefaultNoteIds.slice(0, 1),
              ],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: userBaseDefaultNoteIds[0],
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.DEFAULT);
  });

  it('makes no changes if anchor note is invalid in same category and note is already last one', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorNoteId: new ObjectId(),
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorNote: null,
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
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
            [MovableNoteCategory.ARCHIVE]: {
              order: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              order: [...userBaseDefaultNoteIds, note._id],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.DEFAULT);
  });

  it('makes no changes if category is already same without anchor note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorNote: null,
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.allStats()).toStrictEqual(
      expect.objectContaining({
        readAndModifyCount: 2,
        readCount: 2,
      })
    );
  });

  it('makes no changes if nothing is specified for normal note', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorNote: null,
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.allStats()).toStrictEqual(
      expect.objectContaining({
        readAndModifyCount: 2,
        readCount: 2,
      })
    );
  });

  it('changes category for user with read-only access', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
        },
      },
      {
        user: userNotOwner,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: null,
          anchorNote: null,
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(userNotOwner._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: userNotOwner._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: userNotOwner._id,
        notes: {
          category: {
            [MovableNoteCategory.ARCHIVE]: {
              order: [note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
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
    const dbNoteUser = findNoteUser(userNotOwner._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      MovableNoteCategory.ARCHIVE
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
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
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
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

    expect(mockSocketApi.post).toHaveBeenLastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteEvents: {
              events: [
                {
                  __typename: 'NoteUpdatedEvent',
                  note: {
                    id: expect.any(String),
                    location: {
                      categoryName: MovableNoteCategory.ARCHIVE,
                      anchorNote: {
                        id: expect.any(String),
                      },
                      anchorPosition: ListAnchorPosition.AFTER,
                    },
                    categoryName: NoteCategory.ARCHIVE,
                    deletedAt: null,
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

  it('can set category to any string without GraphQL validation', async () => {
    const updateNoteResolver = mockResolver(moveNote);
    await updateNoteResolver(
      {},
      {
        input: {
          noteId: note._id,
          location: {
            categoryName: 'randomCategory' as MovableNoteCategory,
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
            [MovableNoteCategory.ARCHIVE]: {
              order: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
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
    const dbNoteUser = findNoteUser(user._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      'randomCategory'
    );
  });

  describe('errors', () => {
    it('throws note not found if noteId is invalid', async () => {
      const response = await executeOperation(
        {
          noteId: new ObjectId(),
          location: {
            categoryName: MovableNoteCategory.ARCHIVE,
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
          location: {
            categoryName: MovableNoteCategory.ARCHIVE,
          },
        },
        { user: userNoAccess }
      );

      expectGraphQLResponseErrorMessage(response, /Note '.+' not found/);
    });

    it('throws error if not authenticated', async () => {
      const response = await executeOperation({
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
        },
      });

      expectGraphQLResponseErrorMessage(response, /You are not auth.*/);
    });
  });
});

describe('note is trashed', () => {
  beforeEach(async () => {
    userAddNote(user, note, {
      override: {
        trashed: {
          expireAt: new Date(2),
          originalCategoryName: MovableNoteCategory.ARCHIVE,
        },
        categoryName: NoteCategory.TRASH,
      },
    });

    await populateExecuteAll();
    mongoCollectionStats.mockClear();
  });

  it('user moves trashed note to another category, note is untrashed', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorNoteId: userBaseArchiveNoteIds.at(0),
          anchorPosition: ListAnchorPosition.AFTER,
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(userBaseArchiveNoteIds.at(0))}:${objectIdToStr(
              user._id
            )}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
            },
            [MovableNoteCategory.ARCHIVE]: {
              order: [
                ...userBaseArchiveNoteIds.slice(0, 1),
                note._id,
                ...userBaseArchiveNoteIds.slice(1),
              ],
            },
            [NoteCategory.TRASH]: {
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
    expect(dbNote?.users).toStrictEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          _id: user._id,
          trashed: expect.any(Object),
        }),
      ])
    );
  });

  it('user moves note out of trash, original category is restored', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveNote: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorNote: {
            id: `${objectIdToStr(userBaseArchiveNoteIds.at(-1))}:${objectIdToStr(
              user._id
            )}`,
          },
        },
        note: {
          id: `${objectIdToStr(note._id)}:${objectIdToStr(user._id)}`,
          noteId: objectIdToStr(note._id),
          categoryName: MovableNoteCategory.ARCHIVE,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(4);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        notes: {
          category: {
            [MovableNoteCategory.DEFAULT]: {
              order: userBaseDefaultNoteIds,
            },
            [MovableNoteCategory.ARCHIVE]: {
              order: [...userBaseArchiveNoteIds, note._id],
            },
            [NoteCategory.TRASH]: {
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
    expect(dbNote?.users).toStrictEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          _id: user._id,
          trashed: expect.any(Object),
        }),
      ])
    );
  });

  it('publishes only to self that note is moved out of trash', async () => {
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
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
        },
      },
      {
        user,
        createPublisher: createMockedPublisher,
      }
    );
    expectGraphQLResponseData(response);

    expect(mockSubscriptionsModel.queryAllByTopic).lastCalledWith(
      `${SubscriptionTopicPrefix.NOTE_EVENTS}:userId=${objectIdToStr(user._id)}`
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

    expect(mockSocketApi.post).lastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            noteEvents: {
              events: [
                {
                  __typename: 'NoteUpdatedEvent',
                  note: {
                    id: expect.any(String),
                    location: {
                      categoryName: MovableNoteCategory.ARCHIVE,
                      anchorPosition: ListAnchorPosition.AFTER,
                      anchorNote: {
                        id: `${objectIdToStr(
                          userBaseArchiveNoteIds.at(-1)
                        )}:${objectIdToStr(user._id)}`,
                      },
                    },
                    deletedAt: null,
                    categoryName: NoteCategory.ARCHIVE,
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
