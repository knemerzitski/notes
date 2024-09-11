import { ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user';
import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';
import { TransactionContext } from '../../utils/with-transaction';

interface DeleteUserFromNoteParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  /**
   * Target note id
   */
  noteId: ObjectId;
  /**
   * NoteUser to be deleted from note
   */
  noteUser: MongoReadonlyDeep<{ _id: ObjectId; categoryName: string }>;
}

export function deleteUserFromNote({
  mongoDB,
  noteId,
  noteUser,
}: DeleteUserFromNoteParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $pull: {
            users: {
              _id: noteUser._id,
            },
          },
        },
        {
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
        },
        { session }
      )
    ),
  ]);
}
