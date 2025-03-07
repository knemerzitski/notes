import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
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
  openNote: Omit<OpenNoteSchema | DBOpenNoteSchema, 'clients'>;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  openNote = OpenNoteSchema.createRaw({
    clients: [],
    ...openNote,
  });

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
      },
      {
        ignoreUndefined: true,
        session,
        upsert: true,
      }
    )
  );
}
