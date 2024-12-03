import { ObjectId, UpdateFilter } from 'mongodb';

import { Maybe } from '~utils/types';

import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

interface UpdateMoveCategoryParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  noteId: ObjectId;
  /**
   * Current note index, must be >= 0
   */
  noteIndex?: Maybe<number>;
  noteUser: MongoReadonlyDeep<{
    _id: ObjectId;
    categoryName: string;
    trashed?: Maybe<object>;
  }>;
  /**
   * New note category
   */
  categoryName: string;
  /**
   * Move note to a specific position relative to existing note
   */
  anchor?: {
    /**
     * Index of an existing note in {@link categoryName}
     * Must be >= 0
     */
    index: number;
    /**
     * How note is moved relative to note at index
     */
    position: 'after' | 'before';
  };
}

/**
 * Move note between categories. Can move at a specific index using anchor.
 * If note is trashed then it's removed from trash.
 */
export function updateMoveCategory({
  mongoDB,
  noteId,
  noteIndex,
  noteUser,
  categoryName,
  anchor,
}: UpdateMoveCategoryParams) {
  if (anchor && anchor.index < 0) {
    throw new Error(`Expected anchor.index to be non-negative but is ${anchor.index}`);
  }

  const isNoteInCorrectCategory = noteUser.categoryName === categoryName;

  if (anchor != null && noteIndex != null) {
    if (isNoteInCorrectCategory) {
      if (noteIndex === anchor.index) {
        // Anchor is same as moving note, final order won't change
        return Promise.resolve();
      }

      const finalIndex =
        anchor.index +
        (anchor.position === 'after' ? 1 : 0) +
        (noteIndex < anchor.index ? -1 : 0);

      if (noteIndex === finalIndex) {
        // Already pointing to same index, no move needed
        return;
      }
    }
  }

  if (anchor == null && isNoteInCorrectCategory) {
    return;
  }

  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());
  const updatePromises: Promise<unknown>[] = [];

  if (!isNoteInCorrectCategory) {
    // Move note in user document from one category to other
    updatePromises.push(
      runSingleOperation((session) =>
        mongoDB.collections.users.updateOne(
          {
            _id: noteUser._id,
          },
          {
            $pull: {
              [notesArrayPath(noteUser.categoryName)]: noteId,
            },
            $push: {
              [notesArrayPath(categoryName)]: anchor
                ? {
                    $each: [noteId],
                    $position: anchor.index + (anchor.position === 'after' ? 1 : 0),
                  }
                : noteId,
            },
          },
          {
            session,
          }
        )
      )
    );
  } else {
    // Category is same, must use bulkWrite to change index in array
    updatePromises.push(
      runSingleOperation((session) =>
        mongoDB.collections.users.bulkWrite(
          [
            {
              updateOne: {
                filter: {
                  _id: noteUser._id,
                },
                update: {
                  $pull: {
                    [notesArrayPath(noteUser.categoryName)]: noteId,
                  },
                },
              },
            },
            {
              updateOne: {
                filter: {
                  _id: noteUser._id,
                },
                update: {
                  $push: {
                    [notesArrayPath(categoryName)]: anchor
                      ? {
                          $each: [noteId],
                          $position:
                            anchor.index +
                            (anchor.position === 'after' ? 1 : 0) +
                            (noteIndex != null && noteIndex < anchor.index ? -1 : 0),
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
      )
    );
  }

  const noteUserArrayFilter = 'noteUser';
  const isNoteTrashed = noteUser.trashed != null;
  let noteUpdateFilter: UpdateFilter<Document> | undefined;

  // Update note category
  if (!isNoteInCorrectCategory) {
    noteUpdateFilter = {
      ...noteUpdateFilter,
      $set: {
        ...noteUpdateFilter?.$set,
        [`users.$[${noteUserArrayFilter}].categoryName`]: categoryName,
      },
    };
  }

  // Clear trashed embedded document
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
      runSingleOperation((session) =>
        mongoDB.collections.notes.updateOne(
          {
            _id: noteId,
          },
          noteUpdateFilter,
          {
            session,
            arrayFilters: [
              {
                [`${noteUserArrayFilter}._id`]: noteUser._id,
              },
            ],
          }
        )
      )
    );
  }

  return Promise.all(updatePromises);
}
