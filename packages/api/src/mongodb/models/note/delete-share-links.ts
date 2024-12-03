import { ObjectId } from 'mongodb';

import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';

export async function deleteShareLinks({
  mongoDB,
  noteId,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
  };
  noteId: ObjectId;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return runSingleOperation((session) =>
    mongoDB.collections.notes.updateOne(
      {
        _id: noteId,
      },
      {
        $unset: {
          shareLinks: 1,
        },
      },
      {
        session,
      }
    )
  );
}
