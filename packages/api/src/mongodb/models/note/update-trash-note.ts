import { ObjectId } from 'mongodb';

import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { MongoReadonlyDeep } from '../../types';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

interface UpdateTrashNoteParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  noteId: ObjectId;
  noteUser: MongoReadonlyDeep<{ _id: ObjectId; categoryName: string }>;
  /**
   * Date when note expires in trash and is deleted
   */
  expireAt: Date;
  /**
   * Name of trash category
   */
  trashCategoryName: string;
}

export function updateTrashNote({
  mongoDB,
  noteId,
  noteUser,
  expireAt,
  trashCategoryName,
}: UpdateTrashNoteParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  const noteUserArrayFilter = 'noteUser';
  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $set: {
            [`users.$[${noteUserArrayFilter}].trashed`]: {
              expireAt,
              originalCategoryName: noteUser.categoryName,
            },
            [`users.$[${noteUserArrayFilter}].categoryName`]: trashCategoryName,
          },
        },
        {
          arrayFilters: [
            {
              [`${noteUserArrayFilter}._id`]: noteUser._id,
            },
          ],
          session,
        }
      )
    ),
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
            [notesArrayPath(trashCategoryName)]: noteId,
          },
        },
        { session }
      )
    ),
  ]);
}
