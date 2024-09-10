import { ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user';
import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import { MongoReadonlyDeep } from '../../types';

interface UpdateTrashNoteParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  } & Pick<TransactionContext, 'runSingleOperation'>;
  noteId: ObjectId;
  noteUser: MongoReadonlyDeep<{ _id: ObjectId }>;
  /**
   * Date when note expires in trash and is deleted
   */
  expireAt: Date;
  /**
   * Note user existting category
   */
  existingCategoryName: string;
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
  existingCategoryName,
  trashCategoryName,
}: UpdateTrashNoteParams) {
  const noteUserArrayFilter = 'noteUser';
  return Promise.all([
    mongoDB.runSingleOperation((session) =>
      mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $set: {
            [`users.$[${noteUserArrayFilter}].trashed`]: {
              expireAt,
              originalCategoryName: existingCategoryName,
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
    mongoDB.runSingleOperation((session) =>
      mongoDB.collections.users.updateOne(
        {
          _id: noteUser._id,
        },
        {
          $pull: {
            [getNotesArrayPath(existingCategoryName)]: noteId,
          },
          $push: {
            [getNotesArrayPath(trashCategoryName)]: noteId,
          },
        },
        { session }
      )
    ),
  ]);
}
