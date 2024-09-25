import { MongoDBCollections, CollectionName } from '../../collections';
import { DBOpenNoteSchema, OpenNoteSchema } from '../../schema/open-note';
import { TransactionContext } from '../../utils/with-transaction';

export async function upsertOpenNote({
  mongoDB,
  openNote,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.OPEN_NOTES>;
  };
  openNote: OpenNoteSchema | DBOpenNoteSchema;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  openNote = OpenNoteSchema.createRaw(openNote);

  return runSingleOperation((session) =>
    mongoDB.collections.openNotes.updateOne(
      {
        noteId: openNote.noteId,
        userId: openNote.userId,
      },
      {
        $setOnInsert: {
          noteId: openNote.noteId,
          userId: openNote.userId,
        },
        $set: {
          expireAt: openNote.expireAt,
          collabText: openNote.collabText,
        },
        $addToSet: {
          connectionIds: { $each: openNote.connectionIds },
        },
      },
      {
        session,
        upsert: true,
      }
    )
  );
}
