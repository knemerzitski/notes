/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { Subscription } from '../../../../../../../lambda-graphql/src/dynamodb/models/subscription';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createMockedPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { mockResolver } from '../../../../../__tests__/helpers/graphql/mock-resolver';
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
import {
  populateNotes,
  userAddNote,
} from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { findNoteUserInSchema } from '../../../../../services/note/note';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import {
  ListAnchorPosition,
  MovableNoteCategory,
  MoveUserNoteLinkInput,
  MoveUserNoteLinkPayload,
  NoteCategory,
} from '../../../types.generated';
import { signedInUserTopic } from '../../../user/resolvers/Subscription/signedInUserEvents';

import { moveUserNoteLink } from './moveUserNoteLink';

const MUTATION = `#graphql
  mutation($input: MoveUserNoteLinkInput!){
    moveUserNoteLink(input: $input) {
      location {
        categoryName
        anchorUserNoteLink {
          id
        }
        anchorPosition
      }
      userNoteLink {
        id
        categoryName
        deletedAt
      }
    }
  }
`;

const SUBSCRIPTION = `#graphql
  subscription ($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
      mutations {
        __typename
        ... on MoveUserNoteLinkPayload {
          location {
          categoryName
          anchorUserNoteLink {
            id
          }
          anchorPosition
          }
          userNoteLink {
            id
            categoryName
            deletedAt
          }
        }
      }
    }   
  }
`;

let user: DBUserSchema;
let userNotOwner: DBUserSchema;
let note: DBNoteSchema;
let userBaseDefaultNoteIds: ObjectId[];
let userBaseArchiveNoteIds: ObjectId[];

beforeEach(async () => {
  faker.seed(3213);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  userNotOwner = fakeUserPopulateQueue();

  ({ note } = fakeNotePopulateQueue(user));

  const populateResult = populateNotes(6, {
    user,
    mapNoteUser(note, noteIndex) {
      return {
        ...note,
        override: {
          ...note.override,
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
  input: Omit<MoveUserNoteLinkInput, 'authUser' | 'note'> & {
    noteId: ObjectId;
  },
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      moveUserNoteLink: MoveUserNoteLinkPayload;
    },
    { input?: MoveUserNoteLinkInput }
  >(
    {
      query,
      variables: {
        input: {
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          note: {
            id: input.noteId,
          },
          location: input.location,
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

describe('note in normal categories', () => {
  let userNoAccess: DBUserSchema;

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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseArchiveNoteIds.at(-1)!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [...userBaseArchiveNoteIds, note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      MovableNoteCategory.ARCHIVE
    );
  });

  it('moves note after specific anchor note to another category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseArchiveNoteIds[1]!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [
                ...userBaseArchiveNoteIds.slice(0, 1),
                note._id,
                ...userBaseArchiveNoteIds.slice(1),
              ],
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
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
          anchorPosition: ListAnchorPosition.BEFORE,
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseDefaultNoteIds[0]!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: [
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
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.DEFAULT);
  });

  it('moves note to end of category if anchor note is invalid in another category', async () => {
    const response = await executeOperation(
      {
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.AFTER,
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseArchiveNoteIds.at(-1)!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [...userBaseArchiveNoteIds, note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
    expect(dbNoteUser?.categoryName).toStrictEqual(MovableNoteCategory.ARCHIVE);
  });

  it('makes no change if anchor note is invalid in same category', async () => {
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(note._id, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(userBaseDefaultNoteIds[0]!, user._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: [...userBaseDefaultNoteIds, note._id],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: userBaseDefaultNoteIds[0],
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorUserNoteLink: null,
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
        },
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

    // Database, User
    const dbUser = await mongoCollections.users.findOne({
      _id: user._id,
    });
    expect(dbUser).toEqual(
      expect.objectContaining({
        _id: user._id,
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: [...userBaseDefaultNoteIds, note._id],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorUserNoteLink: null,
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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

  it('makes no changes if nothing is specified for non-trashed note', async () => {
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.DEFAULT,
          anchorPosition: null,
          anchorUserNoteLink: null,
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
          categoryName: MovableNoteCategory.DEFAULT,
          deletedAt: null,
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: null,
          anchorUserNoteLink: null,
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, userNotOwner._id),
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [note._id],
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: [],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(userNotOwner._id, dbNote);
    expect(dbNoteUser?.categoryName, 'Category was not updated in Note').toStrictEqual(
      MovableNoteCategory.ARCHIVE
    );
  });

  it('publishes category only to current user', async () => {
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
                  __typename: 'MoveUserNoteLinkPayload',
                  location: {
                    categoryName: MovableNoteCategory.ARCHIVE,
                    anchorPosition: ListAnchorPosition.BEFORE,
                    anchorUserNoteLink: {
                      id: expect.any(String),
                    },
                  },
                  userNoteLink: {
                    id: expect.any(String),
                    categoryName: MovableNoteCategory.ARCHIVE,
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
    const updateNoteResolver = mockResolver(moveUserNoteLink);
    await updateNoteResolver(
      {},
      {
        input: {
          authUser: {
            id: user._id,
          },
          note: {
            id: note._id,
          },
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
        note: {
          categories: {
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: userBaseArchiveNoteIds,
            },
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
            randomCategory: {
              noteIds: [note._id],
            },
          },
        },
      })
    );

    // Database, Note
    const dbNote = await mongoCollections.notes.findOne({
      _id: note._id,
    });
    const dbNoteUser = findNoteUserInSchema(user._id, dbNote);
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

      expectGraphQLResponseError(response, /note not found/i);
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

      expectGraphQLResponseError(response, /note not found/i);
    });

    it('throws error if not authenticated', async () => {
      const response = await executeOperation({
        noteId: note._id,
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
        },
      });

      expectGraphQLResponseError(response, /must be signed in/i);
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
          anchorPosition: ListAnchorPosition.BEFORE,
        },
      },
      {
        user,
      }
    );

    const data = expectGraphQLResponseData(response);

    // Response
    expect(data).toEqual({
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseArchiveNoteIds.at(0)!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [
                ...userBaseArchiveNoteIds.slice(0, 1),
                note._id,
                ...userBaseArchiveNoteIds.slice(1),
              ],
            },
            [NoteCategory.TRASH]: {
              noteIds: [],
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
      moveUserNoteLink: {
        location: {
          categoryName: MovableNoteCategory.ARCHIVE,
          anchorPosition: ListAnchorPosition.BEFORE,
          anchorUserNoteLink: {
            id: UserNoteLink_id(userBaseArchiveNoteIds.at(-1)!, user._id),
          },
        },
        userNoteLink: {
          id: UserNoteLink_id(note._id, user._id),
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
        note: {
          categories: {
            [MovableNoteCategory.DEFAULT]: {
              noteIds: userBaseDefaultNoteIds,
            },
            [MovableNoteCategory.ARCHIVE]: {
              noteIds: [...userBaseArchiveNoteIds, note._id],
            },
            [NoteCategory.TRASH]: {
              noteIds: [],
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
      signedInUserTopic(user._id)
    );
    expect(mockSubscriptionsModel.queryAllByTopic).toBeCalledTimes(1);

    expect(mockSocketApi.post).lastCalledWith({
      message: expect.objectContaining({
        type: 'next',
        payload: {
          data: {
            signedInUserEvents: {
              mutations: [
                {
                  __typename: 'MoveUserNoteLinkPayload',
                  location: {
                    categoryName: MovableNoteCategory.ARCHIVE,
                    anchorPosition: ListAnchorPosition.BEFORE,
                    anchorUserNoteLink: {
                      id: UserNoteLink_id(userBaseArchiveNoteIds.at(-1)!, user._id),
                    },
                  },
                  userNoteLink: {
                    id: UserNoteLink_id(note._id, user._id),
                    categoryName: MovableNoteCategory.ARCHIVE,
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
});
