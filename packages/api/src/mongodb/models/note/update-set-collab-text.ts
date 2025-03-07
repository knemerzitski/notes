import { ObjectId } from 'mongodb';

import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { CollabRecordSchema, DBCollabRecordSchema } from '../../schema/collab-record';
import { CollabTextSchema, DBCollabTextSchema } from '../../schema/collab-text';
import { TransactionContext } from '../../utils/with-transaction';

export function updateSetCollabText({
  mongoDB,
  noteId,
  collabText,
  collabRecords,
}: {
  mongoDB: {
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.COLLAB_RECORDS
    >;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  noteId: ObjectId;
  collabText: CollabTextSchema | DBCollabTextSchema;
  collabRecords: (CollabRecordSchema | DBCollabRecordSchema)[];
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  collabText = CollabTextSchema.createRaw(collabText);

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
    ),
  ]);
}
