import { Collection, MongoClient, ObjectId, UpdateFilter } from 'mongodb';
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
import { objectIdToStr } from '../../mongodb/utils/objectid';
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
  /**
   * Skip priming note loader with the result
   * @default false
   */
  skipPrimeResult?: boolean;
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
   * Note is already moved in correct location. Database was not updated.
   */
  alreadyMoved: boolean;
}

/**
 * Move note using category and anchor for specific position.
 * @returns False if note not found.
 */
export async function updateMoveNote({
  mongoDB,
  userId,
  noteId,
  anchorCategoryName,
  anchorNoteId,
  anchorPosition,
  defaultCategoryName,
  skipPrimeResult,
}: UpdateMoveNoteParams): Promise<UpdateMoveNoteSuccess | 'not_found'> {
  const result = await mongoDB.client.withSession((session) =>
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
          return 'not_found';
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
        return 'not_found';
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
          alreadyMoved: true,
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
          anchorPosition: anchorPosition ?? ('before' as const),
          alreadyMoved: false,
        };
      } else if (anchorInfo?.lastId != null && !anchorInfo.lastId.equals(noteId)) {
        // Use last note as anchor
        return {
          note,
          categoryName: desiredCategoryName,
          anchorNoteId: anchorInfo.lastId,
          anchorPosition: 'after' as const,
          alreadyMoved: false,
        };
      }

      // Anchor unknown
      return {
        note,
        categoryName: desiredCategoryName,
        anchorNoteId: null,
        anchorPosition: null,
        alreadyMoved: false,
      };
    })
  );

  if (result !== 'not_found' && !result.alreadyMoved) {
    if (!skipPrimeResult) {
      mongoDB.loaders.note.prime(
        {
          id: {
            userId: userId,
            noteId: result.note._id,
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
          users: result.note.users?.map((noteUser) => {
            if (!userId.equals(noteUser._id)) {
              return noteUser;
            }

            // Exclude trashed
            const { trashed, ...restNoteUser } = noteUser;

            return {
              ...restNoteUser,
              categoryName: result.categoryName,
            };
          }),
        },
        { clearCache: true }
      );

      if (result.anchorNoteId) {
        mongoDB.loaders.note.prime(
          {
            id: {
              userId: userId,
              noteId: result.anchorNoteId,
            },
            query: {
              _id: 1,
            },
          },
          {
            _id: result.anchorNoteId,
          },
          { clearCache: true }
        );
      }
    }
  }

  return result;
}

interface UpdateTrashNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to trash
   */
  noteId: ObjectId;
  /**
   * How long note is kept in trash in milliseconds
   * @default 1000 * 60 * 60 * 24 * 30 = 30 days
   */
  trashDuration?: number;
  /**
   * Note is moved to this category when trashed
   */
  trashCategoryName: string;
  defaultCategoryName: string;
  /**
   * Skip priming note loader with the result
   * @default false
   */
  skipPrimeResult?: boolean;
}

interface UpdateTrashNoteSuccess {
  expireAt: Date;
  /**
   * True if note is already trashed (db not modified).
   */
  alreadyTrashed: boolean;
}

/**
 * Trash note. It will be deleted after specified duration has passed.
 */
export async function updateTrashNote({
  mongoDB,
  userId,
  noteId,
  defaultCategoryName,
  trashDuration,
  trashCategoryName,
  skipPrimeResult,
}: UpdateTrashNoteParams): Promise<UpdateTrashNoteSuccess | 'not_found'> {
  const note = await mongoDB.loaders.note.load({
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
        },
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!note?._id || !noteUser) {
    return 'not_found';
  }

  const existingExpireAt = noteUser.trashed?.expireAt;
  if (existingExpireAt != null) {
    // Return early since note is already trashed
    return {
      expireAt: existingExpireAt,
      alreadyTrashed: true,
    };
  }

  const existingCategoryName = noteUser.categoryName ?? defaultCategoryName;
  const newExpireAt = new Date(Date.now() + (trashDuration ?? 1000 * 60 * 60 * 24 * 30));

  const noteUserArrayFilter = 'noteUser';

  await mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongoDB.collections.notes.updateOne(
        {
          _id: note._id,
        },
        {
          $set: {
            [`users.$[${noteUserArrayFilter}].trashed`]: {
              expireAt: newExpireAt,
              originalCategoryName: existingCategoryName,
            },
            [`users.$[${noteUserArrayFilter}].categoryName`]: trashCategoryName,
          },
        },
        {
          arrayFilters: [
            {
              [`${noteUserArrayFilter}._id`]: userId,
            },
          ],
          session,
        }
      );
      await mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $pull: {
            [getNotesArrayPath(existingCategoryName)]: note._id,
          },
          $push: {
            [getNotesArrayPath(trashCategoryName)]: note._id,
          },
        },
        { session }
      );
    })
  );

  if (!skipPrimeResult) {
    mongoDB.loaders.note.prime(
      {
        id: {
          userId,
          noteId,
        },
        query: {
          users: {
            categoryName: 1,
            trashed: {
              expireAt: 1,
              originalCategoryName: 1,
            },
          },
        },
      },
      {
        users: note.users?.map((noteUser) => {
          if (!noteUser._id || !userId.equals(noteUser._id)) {
            return noteUser;
          }

          return {
            ...noteUser,
            categoryName: trashCategoryName,
            trashed: {
              ...noteUser.trashed,
              expireAt: newExpireAt,
              originalCategoryName: existingCategoryName,
            },
          };
        }),
      },
      { clearCache: true }
    );
  }

  return {
    expireAt: newExpireAt,
    alreadyTrashed: false,
  };
}

interface UpdateNoteBackgroundColorParams {
  collection: Collection<NoteSchema>;
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to trash
   */
  noteId: ObjectId;
  /**
   * New background color value
   */
  backgroundColor: string;
}

/**
 * Update note background color for a specific user
 */
export async function updateNoteBackgroundColor({
  collection,
  userId,
  noteId,
  backgroundColor,
}: UpdateNoteBackgroundColorParams) {
  const noteUserArrayFilter = 'noteUser';
  return await collection.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${noteUserArrayFilter}].preferences.backgroundColor`]: backgroundColor,
      },
    },
    {
      arrayFilters: [
        {
          [`${noteUserArrayFilter}._id`]: userId,
        },
      ],
    }
  );
}

interface UpdateNoteReadOnlyParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to trash
   */
  noteId: ObjectId;
  /**
   * New background color value
   */
  backgroundColor: string;
  /**
   * Skip priming note loader with the result
   * @default false
   */
  skipPrimeResult?: boolean;
}

/**
 * Update note background color for a specific user
 */
export async function updateNoteBackgroundColor({
  mongoDB,
  userId,
  noteId,
  backgroundColor,
  skipPrimeResult,
}: UpdateNoteBackgroundColorParams) {
  const note = await mongoDB.loaders.note.load({
    id: {
      userId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        preferences: {
          backgroundColor: 1,
        },
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!note?._id || !noteUser) {
    return 'not_found';
  }

  if (noteUser.preferences?.backgroundColor === backgroundColor) {
    // Return early, backgroundColor is already correct
    return 'already_background_color';
  }

  const noteUserArrayFilter = 'noteUser';

  await mongoDB.collections.notes.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${noteUserArrayFilter}].preferences.backgroundColor`]: backgroundColor,
      },
    },
    {
      arrayFilters: [
        {
          [`${noteUserArrayFilter}._id`]: userId,
        },
      ],
    }
  );

  if (!skipPrimeResult) {
    mongoDB.loaders.note.prime(
      {
        id: {
          userId,
          noteId,
        },
        query: {
          users: {
            preferences: {
              backgroundColor: 1,
            },
          },
        },
      },
      {
        users: note.users?.map((noteUser) => {
          const isOtherUser = !userId.equals(noteUser._id);
          if (isOtherUser) {
            return noteUser;
          }
          return {
            ...noteUser,
            preferences: {
              ...noteUser.preferences,
              backgroundColor,
            },
          };
        }),
      },
      { clearCache: true }
    );
  }

  return true;
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
