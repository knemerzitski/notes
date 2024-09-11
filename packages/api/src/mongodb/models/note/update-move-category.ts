import { ObjectId, UpdateFilter } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user'; // TODO nono here
import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import { MongoReadonlyDeep } from '../../types';
import { Maybe } from '~utils/types';

interface UpdateMoveCategoryParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  noteId: ObjectId;
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
  noteUser,
  categoryName,
  anchor,
}: UpdateMoveCategoryParams) {
  if (anchor && anchor.index < 0) {
    throw new Error(`Expected anchor.index to be non-negative but is ${anchor.index}`);
  }

  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());
  const updatePromises: Promise<unknown>[] = [];

  const isNoteInCorrectCategory = noteUser.categoryName === categoryName;
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
              [getNotesArrayPath(noteUser.categoryName)]: noteId,
            },
            $push: {
              [getNotesArrayPath(categoryName)]: anchor
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
                    [getNotesArrayPath(noteUser.categoryName)]: noteId,
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
                    [getNotesArrayPath(categoryName)]: anchor
                      ? {
                          $each: [noteId],
                          $position: anchor.index + (anchor.position === 'after' ? 1 : 0),
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
