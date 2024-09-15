import { MongoDBCollections, CollectionName } from '../../collections';
import { DBNoteSchema, NoteSchema } from '../../schema/note';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

interface InsertNoteParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  note: NoteSchema | DBNoteSchema;
}

export async function insertNote({ mongoDB, note }: InsertNoteParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  if (note.users.length === 0) {
    throw new Error('Cannot insert note without a user');
  }

  note = NoteSchema.createRaw(note);

  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.notes.insertOne(note, {
        session,
      })
    ),
    runSingleOperation((session) =>
      mongoDB.collections.users.bulkWrite(
        note.users.map((noteUser) => ({
          updateOne: {
            filter: {
              _id: noteUser._id,
            },
            update: {
              $push: {
                [notesArrayPath(noteUser.categoryName)]: note._id,
              },
            },
          },
        })),
        { session }
      )
    ),
  ]);
}
