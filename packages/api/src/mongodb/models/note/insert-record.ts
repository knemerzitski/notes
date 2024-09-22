import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import {
  DBRevisionChangesetSchema,
  DBRevisionRecordSchema,
  RevisionChangesetSchema,
  RevisionRecordSchema,
} from '../../schema/collab-text';
import { createRaw } from 'superstruct';

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
  newRecord: RevisionRecordSchema | DBRevisionRecordSchema;
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
  newRecord = createRaw(newRecord, RevisionRecordSchema);
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
