import { ObjectId } from 'mongodb';

import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';

export interface UpdateDisplayNameParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.USERS>;
  };
  userId: ObjectId;
  displayName: string;
}

export function updateDisplayName({
  mongoDB,
  userId,
  displayName,
}: UpdateDisplayNameParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return runSingleOperation((session) =>
    mongoDB.collections.users.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          'profile.displayName': displayName,
        },
      },
      {
        session,
      }
    )
  );
}
