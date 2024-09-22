import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import { CollabTextSchema, DBCollabTextSchema } from '../../schema/collab-text';

export function updateSetCollabText({
  mongoDB,
  noteId,
  collabText,
}: {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  noteId: ObjectId;
  collabText: CollabTextSchema | DBCollabTextSchema;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  collabText = CollabTextSchema.createRaw(collabText);

  return runSingleOperation((session) =>
    mongoDB.collections.notes.updateOne(
      {
        _id: noteId,
      },
      {
        $set: {
          collabText,
        },
      },
      {
        session,
      }
    )
  );
}
