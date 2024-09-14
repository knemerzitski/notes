import { ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user'; // !!!! THIS A NONO
import { MongoDBCollections, CollectionName } from '../../collections';
import { DBNoteSchema } from '../../schema/note';
import { NoteUserSchema } from '../../schema/note-user';
import { InferRaw } from 'superstruct';
import { TransactionContext } from '../../utils/with-transaction';

interface InsertNoteParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  userId: ObjectId;
  note: DBNoteSchema;
  noteUser: InferRaw<typeof NoteUserSchema>;
}

export async function insertNote({ mongoDB, userId, note, noteUser }: InsertNoteParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.notes.insertOne(note, {
        session,
      })
    ),
    runSingleOperation((session) =>
      mongoDB.collections.users.updateOne(
        {
          _id: userId,
        },
        {
          $push: {
            [getNotesArrayPath(noteUser.categoryName)]: note._id,
          },
        },
        { session }
      )
    ),
  ]);
}
