import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { DBOpenNoteSchema, OpenNoteSchema } from '../../schema/open-note';
import { TransactionContext } from '../../utils/with-transaction';

export async function updateOpenNote(
  {
    mongoDB,
    openNote,
  }: {
    mongoDB: {
      runSingleOperation?: TransactionContext['runSingleOperation'];
      collections: Pick<MongoDBCollections, CollectionName.OPEN_NOTES>;
    };
    openNote: Omit<OpenNoteSchema | DBOpenNoteSchema, 'clients'>;
  },
  options?: {
    /**
     * @default false
     */
    upsert?: boolean;
  }
) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  const rawOpenNote = OpenNoteSchema.createRaw({
    clients: [],
    ...openNote,
  });

  return runSingleOperation((session) =>
    mongoDB.collections.openNotes.updateOne(
      {
        noteId: rawOpenNote.noteId,
        userId: rawOpenNote.userId,
      },
      {
        $setOnInsert: {
          noteId: rawOpenNote.noteId,
          userId: rawOpenNote.userId,
        },
        $set: {
          expireAt: rawOpenNote.expireAt,
          collabText: rawOpenNote.collabText,
        },
      },
      {
        ignoreUndefined: true,
        session,
        upsert: options?.upsert ?? false,
      }
    )
  );
}
