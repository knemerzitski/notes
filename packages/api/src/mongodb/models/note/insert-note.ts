import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { CollabRecordSchema, DBCollabRecordSchema } from '../../schema/collab-record';
import { DBNoteSchema, NoteSchema } from '../../schema/note';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

interface InsertNoteParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.USERS | CollectionName.COLLAB_RECORDS
    >;
  };
  note: NoteSchema | DBNoteSchema;
  collabRecords: (CollabRecordSchema | DBCollabRecordSchema)[];
}

export async function insertNote({ mongoDB, note, collabRecords }: InsertNoteParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  if (note.users.length === 0) {
    throw new Error('Cannot insert note without a user');
  }

  note = NoteSchema.createRaw(note);

  const dbCollabRecords = collabRecords.map((record) =>
    CollabRecordSchema.createRaw(record)
  );

  return Promise.all([
    ...(dbCollabRecords.length > 0
      ? [
          runSingleOperation((session) =>
            mongoDB.collections.collabRecords.insertMany(dbCollabRecords, {
              session,
            })
          ),
        ]
      : []),
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
