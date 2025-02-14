import { ObjectId } from 'mongodb';

import { createRaw } from 'superstruct';

import { MongoDBCollections, CollectionName } from '../../collections';
import {
  RevisionChangesetSchema,
  DBRevisionChangesetSchema,
} from '../../schema/changeset';
import { CollabRecordSchema, DBCollabRecordSchema } from '../../schema/collab-record';
import { TransactionContext } from '../../utils/with-transaction';

interface InsertRecordParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
  };
  noteId: ObjectId;
  headText: RevisionChangesetSchema | DBRevisionChangesetSchema;
  composedTail?: {
    tailText: RevisionChangesetSchema | DBRevisionChangesetSchema;
    recordsCount: number;
  };
  newRecord: CollabRecordSchema | DBCollabRecordSchema;
}

export async function insertRecord({
  mongoDB,
  noteId,
  headText,
  composedTail,
  newRecord,
}: InsertRecordParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  headText = createRaw(headText, RevisionChangesetSchema);
  newRecord = createRaw(newRecord, CollabRecordSchema);
  if (composedTail) {
    composedTail = {
      ...composedTail,
      tailText: createRaw(composedTail.tailText, RevisionChangesetSchema),
    };
  }

  return runSingleOperation((session) =>
    mongoDB.collections.notes.updateOne(
      {
        _id: noteId,
      },
      {
        $set: {
          ['collabText.headText']: headText,
          ...(composedTail && {
            ['collabText.tailText']: composedTail.tailText,
          }),
        },
        $push: {
          ['collabText.records']:
            composedTail != null && composedTail.recordsCount > 0
              ? {
                  $each: [newRecord],
                  $slice: -composedTail.recordsCount,
                }
              : newRecord,
        },
      },
      {
        session,
      }
    )
  );
}
