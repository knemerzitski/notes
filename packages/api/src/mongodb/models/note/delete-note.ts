import { ClientSession, ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user';
import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';

interface DeleteNoteParams {
  mongoDB: {
    session?: ClientSession;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  allNoteUsers: MongoReadonlyDeep<{ _id: ObjectId; categoryName: string }[]>;
}

export function deleteNote({ mongoDB, noteId, allNoteUsers }: DeleteNoteParams) {
  return Promise.all([
    mongoDB.collections.notes.deleteOne(
      {
        _id: noteId,
      },
      { session: mongoDB.session }
    ),
    mongoDB.collections.users.bulkWrite(
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
      { session: mongoDB.session }
    ),
  ]);
}
