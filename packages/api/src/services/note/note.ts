import { MongoClient, ObjectId, UpdateFilter } from 'mongodb';
import { NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { createCollabText, queryWithCollabTextSchema } from '../collab/collab';
import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { Maybe, WithRequired } from '~utils/types';
import { isDefined } from '~utils/type-guards/is-defined';
import { QueryableNote, QueryableNoteCollab } from '../../mongodb/descriptions/note';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { ObjectQueryDeep, QueryResultDeep } from '../../mongodb/query/query';
import { CollabSchema } from '../../mongodb/schema/collab';
import { getNotesArrayPath } from '../user/user';
import { objectIdToStr } from '../utils/objectid';
import { MongoDBLoaders } from '../../mongodb/loaders';

interface InsertNewNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  userId: ObjectId;
  backgroundColor?: Maybe<string>;
  categoryName: string;
  collabTexts?: Maybe<Record<string, { initialText: string }>>;
}

export async function insertNewNote({
  mongoDB,
  userId,
  backgroundColor,
  categoryName,
  collabTexts,
}: InsertNewNoteParams) {
  let preferences: NoteUserSchema['preferences'] | undefined;
  if (backgroundColor) {
    preferences = {
      backgroundColor,
    };
  }
  const noteUser: NoteUserSchema = {
    _id: userId,
    createdAt: new Date(),
    categoryName,
    ...(preferences && { preferences }),
  };

  const note: NoteSchema = {
    _id: new ObjectId(),
    users: [noteUser],
    ...(collabTexts && {
      collab: {
        updatedAt: new Date(),
        texts: Object.entries(collabTexts).map(([key, value]) => ({
          k: key,
          v: createCollabText({
            creatorUserId: userId,
            initialText: value.initialText,
          }),
        })),
      },
    }),
  };

  await mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // First request must not be done in parallel or you get NoSuchTransaction error
      await mongoDB.collections.notes.insertOne(note, { session });

      // Now can do requests in parellel
      await mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $push: {
            [getNotesArrayPath(noteUser.categoryName)]: note._id,
          },
        },
        { session }
      );
    })
  );

  return note;
}

interface DeleteNoteCompletelyParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  allNoteUsers: Pick<NoteUserSchema, '_id' | 'categoryName'>[];
}

export function deleteNoteCompletely({
  mongoDB,
  noteId,
  allNoteUsers,
}: DeleteNoteCompletelyParams) {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongoDB.collections.notes.deleteOne(
        {
          _id: noteId,
        },
        { session }
      );
      await mongoDB.collections.users.bulkWrite(
        allNoteUsers.map((noteUser) => ({
          updateOne: {
            filter: {
              _id: noteUser._id,
            },
            update: {
              $pull: {
                [getNotesArrayPath(noteUser.categoryName)]: noteId,
              },
            },
          },
        })),
        { session }
      );
    })
  );
}

interface DeleteNoteFromUserParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  noteCategoryName: string;
  userId: ObjectId;
}

export function deleteNoteFromUser({
  mongoDB,
  noteId,
  userId,
  noteCategoryName,
}: DeleteNoteFromUserParams) {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $pull: {
            users: {
              _id: userId,
            },
          },
        },
        {
          session,
        }
      );
      await mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $pull: {
            [getNotesArrayPath(noteCategoryName)]: noteId,
          },
        },
        { session }
      );
    })
  );
}

interface UpdateMoveNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'note' | 'user'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to move
   */
  noteId: ObjectId;
  /**
   * Category where to move the note.
   * If category is not defined and note is trashed then it's moved to category before trash.
   */
  anchorCategoryName?: Maybe<string>;
  /**
   * Anchor note for relative move.
   */
  anchorNoteId?: Maybe<ObjectId>;
  /**
   * How to position note relative to {@link anchorNoteId}
   */
  anchorPosition?: Maybe<'before' | 'after'>;
  /**
   * categoryName to use incase it cannot be found
   */
  defaultCategoryName: string;
}

interface UpdateMoveNoteSuccess {
  /**
   * Moved note
   */
  note: WithRequired<QueryResultDeep<QueryableNote>, '_id'>;
  /**
   * Category after note move
   */
  categoryName: string;
  /**
   * Anchor used moving the note
   */
  anchorNoteId: ObjectId | null;
  /**
   * Position used moving the note
   */
  anchorPosition: 'before' | 'after' | null;
  /**
   * Note had to be moved. Database was updated.
   */
  modified: boolean;
}

/**
 * Move note using category and anchor for specific position.
 * @returns False if note not found.
 */
export function updateMoveNote({
  mongoDB,
  userId,
  noteId,
  anchorCategoryName,
  anchorNoteId,
  anchorPosition,
  defaultCategoryName,
}: UpdateMoveNoteParams): Promise<UpdateMoveNoteSuccess | false> {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // Fetching everything that's helpful for note moving
      const processedNotePromise = mongoDB.loaders.note
        .load({
          id: {
            userId,
            noteId,
          },
          query: {
            _id: 1,
            users: {
              _id: 1,
              categoryName: 1,
              trashed: {
                expireAt: 1,
                originalCategoryName: 1,
              },
            },
          },
        })
        .then((note) => {
          const noteUser = findNoteUser(userId, note);
          if (!note?._id || !noteUser) {
            return false;
          }

          const isNoteTrashed = noteUser.trashed != null;

          const existingCategoryName = noteUser.categoryName ?? defaultCategoryName;
          const desiredCategoryName =
            anchorCategoryName ??
            (isNoteTrashed ? noteUser.trashed.originalCategoryName : null) ??
            defaultCategoryName;

          return {
            note: {
              ...note,
              _id: note._id,
            },
            noteUser,
            isNoteTrashed,
            existingCategoryName,
            desiredCategoryName,
          };
        });

      // Figure out categoryName since it's note defined in args
      if (!anchorCategoryName) {
        const processedNote = await processedNotePromise;
        if (!processedNote) {
          return false as const;
        }
        anchorCategoryName = processedNote.desiredCategoryName;
      }

      interface AnchorLocationInfo {
        // Anchor is at specified index. Value is -1 or null if index is unknown
        anchorIndex: number | null;
        // Last note id in list. Null if list is empty.
        lastId: ObjectId | null;
      }
      const anchorInfoPromise = mongoDB.collections.users
        .aggregate<AnchorLocationInfo>(
          [
            {
              $match: {
                _id: userId,
              },
            },
            {
              $project: {
                _id: 0,
                anchorIndex: anchorNoteId
                  ? {
                      $indexOfArray: [
                        `$${getNotesArrayPath(anchorCategoryName)}`,
                        anchorNoteId,
                      ],
                    }
                  : null,
                lastId: {
                  $last: `$${getNotesArrayPath(anchorCategoryName)}`,
                },
              },
            },
          ],
          {
            session,
          }
        )
        .toArray()
        .then((users) => users[0]);

      const [processedNote, anchorInfo] = await Promise.all([
        processedNotePromise,
        anchorInfoPromise,
      ]);
      if (!processedNote) {
        return false as const;
      }
      const { note, isNoteTrashed, existingCategoryName, desiredCategoryName } =
        processedNote;

      const isNoteInCorrectCategory = existingCategoryName === desiredCategoryName;
      const haveNothingToMove = isNoteInCorrectCategory && anchorNoteId == null;
      if (haveNothingToMove) {
        return {
          note,
          categoryName: desiredCategoryName,
          anchorNoteId: null,
          anchorPosition: null,
          modified: false,
        };
      }

      const noteUserArrayFilter = 'noteUser';

      const updatePromises: Promise<unknown>[] = [];

      if (isNoteInCorrectCategory) {
        // Category is same, must use bulkWrite to change index in array
        updatePromises.push(
          mongoDB.collections.users.bulkWrite(
            [
              {
                updateOne: {
                  filter: {
                    _id: userId,
                  },
                  update: {
                    $pull: {
                      [getNotesArrayPath(existingCategoryName)]: noteId,
                    },
                  },
                },
              },
              {
                updateOne: {
                  filter: {
                    _id: userId,
                  },
                  update: {
                    $push: {
                      [getNotesArrayPath(existingCategoryName)]:
                        anchorInfo?.anchorIndex != null && anchorInfo.anchorIndex !== -1
                          ? {
                              $each: [noteId],
                              $position:
                                anchorInfo.anchorIndex +
                                (anchorPosition === 'after' ? 1 : 0),
                            }
                          : noteId,
                    },
                  },
                },
              },
            ],
            {
              session,
            }
          )
        );
      } else {
        // Move note in user document from one category to other
        updatePromises.push(
          mongoDB.collections.users.updateOne(
            {
              _id: userId,
            },
            {
              $pull: {
                [getNotesArrayPath(existingCategoryName)]: noteId,
              },
              $push: {
                [getNotesArrayPath(desiredCategoryName)]:
                  anchorInfo?.anchorIndex != null && anchorInfo.anchorIndex !== -1
                    ? {
                        $each: [noteId],
                        $position:
                          anchorInfo.anchorIndex + (anchorPosition === 'after' ? 1 : 0),
                      }
                    : noteId,
              },
            },
            {
              session,
            }
          )
        );
      }

      let noteUpdateFilter: UpdateFilter<Document> | undefined;

      // Change categoryName in Note document
      if (existingCategoryName !== desiredCategoryName) {
        noteUpdateFilter = {
          ...noteUpdateFilter,
          $set: {
            ...noteUpdateFilter?.$set,
            [`users.$[${noteUserArrayFilter}].categoryName`]: desiredCategoryName,
          },
        };
      }

      // Delete trashed since note is moved out of trash
      if (isNoteTrashed) {
        noteUpdateFilter = {
          ...noteUpdateFilter,
          $unset: {
            ...noteUpdateFilter?.$unset,
            [`users.$[${noteUserArrayFilter}].trashed`]: 1,
          },
        };
      }

      if (noteUpdateFilter) {
        updatePromises.push(
          mongoDB.collections.notes.updateOne(
            {
              _id: noteId,
            },
            noteUpdateFilter,
            {
              session,
              arrayFilters: [
                {
                  [`${noteUserArrayFilter}._id`]: userId,
                },
              ],
            }
          )
        );
      }

      await Promise.all(updatePromises);

      if (
        anchorInfo?.anchorIndex != null &&
        anchorInfo.anchorIndex !== -1 &&
        anchorNoteId != null
      ) {
        // Use anchor
        return {
          note,
          categoryName: desiredCategoryName,
          anchorNoteId,
          anchorPosition: anchorPosition ?? 'before',
          modified: true,
        };
      } else if (anchorInfo?.lastId != null && !anchorInfo.lastId.equals(noteId)) {
        // Use last note as anchor
        return {
          note,
          categoryName: desiredCategoryName,
          anchorNoteId: anchorInfo.lastId,
          anchorPosition: 'after',
          modified: true,
        };
      }

      // Anchor unknown
      return {
        note,
        categoryName: desiredCategoryName,
        anchorNoteId: null,
        anchorPosition: null,
        modified: true,
      };
    })
  );
}

interface PrimeUpdateMoveNoteSuccessParams {
  mongoDB: {
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  userId: ObjectId;
  move: UpdateMoveNoteSuccess;
}

export function primeUpdateMoveNoteSuccess({
  mongoDB,
  userId,
  move,
}: PrimeUpdateMoveNoteSuccessParams) {
  if (!move.modified) return;

  mongoDB.loaders.note.prime(
    {
      id: {
        userId: userId,
        noteId: move.note._id,
      },
      query: {
        users: {
          _id: 1,
          categoryName: 1,
          trashed: {
            expireAt: 1,
            originalCategoryName: 1,
          },
        },
      },
    },
    {
      users: move.note.users?.map((noteUser) => {
        if (!userId.equals(noteUser._id)) {
          return noteUser;
        }

        // Exclude trashed
        const { trashed, ...restNoteUser } = noteUser;

        return {
          ...restNoteUser,
          categoryName: move.categoryName,
        };
      }),
    },
    { clearCache: true }
  );

  if (move.anchorNoteId) {
    mongoDB.loaders.note.prime(
      {
        id: {
          userId: userId,
          noteId: move.anchorNoteId,
        },
        query: {
          _id: 1,
        },
      },
      {
        _id: move.anchorNoteId,
      },
      { clearCache: true }
    );
  }
}

interface QueryWithNoteSchemaParams {
  query: ObjectQueryDeep<QueryableNote>;
  note: NoteSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteSchema({
  query,
  note,
  userLoader,
}: QueryWithNoteSchemaParams): Promise<QueryResultDeep<QueryableNote>> {
  const queryCollab = query.collab;
  const { collab, ...noteNoCollab } = note;
  if (!queryCollab || !collab) {
    return noteNoCollab;
  }

  return {
    ...noteNoCollab,
    collab: await queryWithNoteCollabSchema({
      query: queryCollab,
      collab,
      userLoader,
    }),
  };
}

interface QueryWithNoteCollabSchemaParams {
  query: ObjectQueryDeep<QueryableNoteCollab>;
  collab: CollabSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteCollabSchema({
  query,
  collab,
  userLoader,
}: QueryWithNoteCollabSchemaParams): Promise<QueryResultDeep<QueryableNoteCollab>> {
  const queryTexts = query.texts;
  const { texts, ...collabNoTexts } = collab;
  if (!queryTexts) {
    return collabNoTexts;
  }

  return {
    ...collab,
    texts: Object.fromEntries(
      (
        await Promise.all(
          collab.texts.map(async ({ k, v }) => {
            const queryText = queryTexts[k];
            if (!queryText) return;

            return [
              k,
              await queryWithCollabTextSchema({
                query: queryText,
                collabText: v,
                userLoader,
              }),
            ];
          })
        )
      ).filter(isDefined)
    ),
  };
}

export function findNoteUser(
  findUserId: ObjectId,
  note: Maybe<QueryResultDeep<QueryableNote>>
) {
  return note?.users?.find(({ _id: userId }) => findUserId.equals(userId));
}

export function findNoteUserInSchema(userId: ObjectId, note: Maybe<NoteSchema>) {
  return note?.users.find((noteUser) => noteUser._id.equals(userId));
}

export function findOldestNoteUser(note: Maybe<QueryResultDeep<QueryableNote>>) {
  return note?.users?.reduce((oldest, user) => {
    if (!user.createdAt) return oldest;
    if (!oldest.createdAt) return user;
    return oldest.createdAt < user.createdAt ? oldest : user;
  });
}

export function findNoteTextFieldInSchema(note: Maybe<NoteSchema>, fieldName: string) {
  if (!note) return;

  const collabTexts = note.collab?.texts
    .filter((text) => text.k === fieldName)
    .map((collabText) => collabText.v);
  return collabTexts?.[0];
}

export function UserNoteLink_id(noteId: ObjectId, userId: ObjectId) {
  return `${objectIdToStr(noteId)}:${objectIdToStr(userId)}`;
}
