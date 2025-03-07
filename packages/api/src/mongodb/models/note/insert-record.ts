import { ObjectId } from 'mongodb';

import { createRaw } from 'superstruct';

import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import {
  RevisionChangesetSchema,
  DBRevisionChangesetSchema,
} from '../../schema/changeset';
import { CollabRecordSchema, DBCollabRecordSchema } from '../../schema/collab-record';
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
  headText: RevisionChangesetSchema | DBRevisionChangesetSchema;
  tailText?: RevisionChangesetSchema | DBRevisionChangesetSchema;
  newRecord: CollabRecordSchema | DBCollabRecordSchema;
}

export async function insertRecord({
  mongoDB,
  noteId,
  headText,
  tailText,
  newRecord,
}: InsertRecordParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  headText = createRaw(headText, RevisionChangesetSchema);
  tailText = tailText ? createRaw(tailText, RevisionChangesetSchema) : undefined;
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
          // Delete records not newer than tailText
          ...(tailText
            ? [
                {
                  deleteMany: {
                    filter: {
                      collabTextId: noteId,
                      revision: {
                        $lte: tailText.revision,
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
            ['collabText.headText']: headText,
            ...(tailText && {
              ['collabText.tailText']: tailText,
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
