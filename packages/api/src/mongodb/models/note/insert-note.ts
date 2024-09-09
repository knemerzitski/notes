import { ClientSession, ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../services/user/user'; // !!!! THIS A NONO
import { MongoDBCollections, CollectionName } from '../../collections';
import { DBNoteSchema } from '../../schema/note';
import { NoteUserSchema } from '../../schema/note-user';
import { InferRaw } from 'superstruct';

interface DeleteNoteParams {
  mongoDB: {
    session?: ClientSession;
    /**
     * Run MongoDB operations in parallel
     * @default false
     */
    parallel?: boolean;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  userId: ObjectId;
  note: DBNoteSchema;
  noteUser: InferRaw<typeof NoteUserSchema>;
}

export async function insertNote({ mongoDB, userId, note, noteUser }: DeleteNoteParams) {
  const insertNotePromise = mongoDB.collections.notes.insertOne(note, {
    session: mongoDB.session,
  });
  if (!mongoDB.parallel) {
    await insertNotePromise;
  }
  return Promise.all([
    insertNotePromise,
    mongoDB.collections.users.updateOne(
      {
        _id: userId,
      },
      {
        $push: {
          [getNotesArrayPath(noteUser.categoryName)]: note._id,
        },
      },
      { session: mongoDB.session }
    ),
  ]);
}
