import { ObjectId } from 'mongodb';

import { createRaw } from 'superstruct';

import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { CollabRecordSchema, DBCollabRecordSchema } from '../../schema/collab-record';
import { TextRecordSchema, DBTextRecordSchema } from '../../schema/collab-text';
import { TransactionContext } from '../../utils/with-transaction';

interface InsertRecordParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.COLLAB_RECORDS
    >;
  };
  noteId: ObjectId;
  headRecord: TextRecordSchema | DBTextRecordSchema;
  tailRecord?: TextRecordSchema | DBTextRecordSchema;
  newRecord: CollabRecordSchema | DBCollabRecordSchema;
}

export async function insertRecord({
  mongoDB,
  noteId,
  headRecord,
  tailRecord,
  newRecord,
}: InsertRecordParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  headRecord = createRaw(headRecord, TextRecordSchema);
  tailRecord = tailRecord ? createRaw(tailRecord, TextRecordSchema) : undefined;
  newRecord = createRaw(newRecord, CollabRecordSchema);

  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.collabRecords.bulkWrite(
        [
          {
            // Insert new record
            insertOne: {
              document: newRecord,
            },
          },
          // Delete records not newer than tailRecord
          ...(tailRecord
            ? [
                {
                  deleteMany: {
                    filter: {
                      collabTextId: noteId,
                      revision: {
                        $lte: tailRecord.revision,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
        {
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $set: {
            ['collabText.headRecord']: headRecord,
            ...(tailRecord && {
              ['collabText.tailRecord']: tailRecord,
            }),
          },
        },
        {
          session,
        }
      )
    ),
  ]);
}
