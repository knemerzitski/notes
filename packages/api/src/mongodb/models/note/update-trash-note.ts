import { ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user';
import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import { MongoReadonlyDeep } from '../../types';

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
            [getNotesArrayPath(noteUser.categoryName)]: noteId,
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
