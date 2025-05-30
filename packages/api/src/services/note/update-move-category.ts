import { MongoClient, ObjectId } from 'mongodb';

import { Maybe } from '../../../../utils/src/types';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { updateMoveCategory as model_updateMoveCategory } from '../../mongodb/models/note/update-move-category';
import { notesArrayPath } from '../../mongodb/models/user/utils/notes-array-path';
import { withTransaction } from '../../mongodb/utils/with-transaction';

import { NoteNotFoundServiceError } from './errors';
import { findNoteUser } from './note';

interface UpdateMoveCategoryParams {
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
   * Note to move
   */
  noteId: ObjectId;
  /**
   * Category where to move the note.
   * If category is not defined and note is trashed then it's moved to category before trash.
   */
  categoryName?: Maybe<string>;
  anchor?: Maybe<{
    /**
     *  Anchor note for relative move
     */
    noteId: ObjectId;
    /**
     * How to position note relative to {@link noteId}
     */
    position: 'after' | 'before';
  }>;
  defaultAnchorPosition?: 'after' | 'before';
}

interface DBAnchor {
  // Anchor is at specified index. Value is -1 or null if index is unknown
  anchorIndex: number | null;
  // Last note id in list. Null if list is empty.
  lastId: ObjectId | null;
  // Note is at specified index. Value is -1 or null if index is unknown
  noteIndex: number | null;
}

/**
 * Trash note. It will be deleted after specified duration has passed.
 */
export async function updateMoveCategory({
  mongoDB,
  userId,
  noteId,
  categoryName,
  anchor,
  defaultAnchorPosition = 'after',
}: UpdateMoveCategoryParams) {
  return withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
    // Fetching everything from note that's helpful for move
    const { note, noteUser } = await runSingleOperation((session) =>
      mongoDB.loaders.note
        .load(
          {
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
          },
          {
            session,
          }
        )
        .then((note) => {
          const noteUser = findNoteUser(userId, note);
          if (!noteUser) {
            throw new NoteNotFoundServiceError(noteId);
          }

          return {
            note,
            noteUser,
          };
        })
    );

    // Must know categoryName before can proceed
    if (!categoryName) {
      categoryName = noteUser.trashed?.originalCategoryName;
    }

    if (!categoryName) {
      // Category name not in params and note isn't trashed
      return {
        type: 'already_category_name' as const,
        categoryName: noteUser.categoryName,
        oldCategoryName: noteUser.categoryName,
      };
    }

    const currentCategoryName = noteUser.categoryName;
    const desiredCategoryName = categoryName;

    const dbAnchor = await runSingleOperation((session) =>
      mongoDB.collections.users
        .aggregate<DBAnchor>(
          [
            {
              $match: {
                _id: userId,
              },
            },
            {
              $project: {
                _id: 0,
                anchorIndex: anchor?.noteId
                  ? {
                      $indexOfArray: [
                        `$${notesArrayPath(desiredCategoryName)}`,
                        anchor.noteId,
                      ],
                    }
                  : null,
                noteIndex: {
                  $indexOfArray: [`$${notesArrayPath(currentCategoryName)}`, noteId],
                },
                lastId: {
                  $last: `$${notesArrayPath(desiredCategoryName)}`,
                },
              },
            },
          ],
          {
            session,
          }
        )
        .toArray()
        .then((users) => users[0])
    );

    const isNoteInCorrectCategory = noteUser.categoryName === desiredCategoryName;
    const haveNothingToMove = isNoteInCorrectCategory && anchor == null;
    if (haveNothingToMove) {
      return {
        type: 'already_category_name' as const,
        categoryName: desiredCategoryName,
        oldCategoryName: currentCategoryName,
      };
    }

    const noteIndex =
      dbAnchor?.noteIndex != null && dbAnchor.noteIndex >= 0 ? dbAnchor.noteIndex : null;

    const validAnchor = getValidAnchor(dbAnchor, anchor);

    await model_updateMoveCategory({
      mongoDB: {
        runSingleOperation,
        collections: mongoDB.collections,
      },
      categoryName: desiredCategoryName,
      noteId,
      noteIndex,
      noteUser,
      anchor: validAnchor,
    });

    const resultAnchor =
      validAnchor ??
      (dbAnchor?.lastId != null && !dbAnchor.lastId.equals(noteId)
        ? {
            id: dbAnchor.lastId,
            position: defaultAnchorPosition,
          }
        : null);

    mongoDB.loaders.note.prime(
      {
        id: {
          userId: userId,
          noteId,
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
        users: note.users.map((noteUser) => {
          if (!userId.equals(noteUser._id)) {
            return noteUser;
          }

          // Exclude trashed
          const { trashed, ...restNoteUser } = noteUser;

          return {
            ...restNoteUser,
            categoryName: desiredCategoryName,
          };
        }),
      }
    );

    if (resultAnchor) {
      mongoDB.loaders.note.prime(
        {
          id: {
            userId: userId,
            noteId: resultAnchor.id,
          },
          query: {
            _id: 1,
          },
        },
        {
          _id: resultAnchor.id,
        }
      );
    }

    return {
      type: 'success' as const,
      note,
      categoryName: desiredCategoryName,
      oldCategoryName: currentCategoryName,
      anchor: resultAnchor,
    };
  });
}

function getValidAnchor(
  dbAnchorInfo: DBAnchor | undefined,
  anchor: UpdateMoveCategoryParams['anchor']
):
  | (Parameters<typeof model_updateMoveCategory>[0]['anchor'] & { id: ObjectId })
  | undefined {
  if (
    dbAnchorInfo?.anchorIndex == null ||
    dbAnchorInfo.anchorIndex < 0 ||
    !anchor?.position
  ) {
    return;
  }

  return {
    id: anchor.noteId,
    index: dbAnchorInfo.anchorIndex,
    position: anchor.position,
  };
}
