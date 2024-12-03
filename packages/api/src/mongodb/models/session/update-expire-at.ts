import { ObjectId } from 'mongodb';

import { CollectionName, MongoDBCollections } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';

export interface UpdateExpireAtParams {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
  };
  sessionId: ObjectId;
  expireAt: Date;
}

export function updateExpireAt({ sessionId, expireAt, mongoDB }: UpdateExpireAtParams) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return runSingleOperation((mongoSession) =>
    mongoDB.collections.sessions.findOneAndUpdate(
      {
        _id: sessionId,
      },
      {
        $set: {
          expireAt,
        },
      },
      {
        session: mongoSession,
      }
    )
  );
}
