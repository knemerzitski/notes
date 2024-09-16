import { CollectionName, MongoDBCollections } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';

export function deleteManyByCookieIds({
  mongoDB,
  cookieIds,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
  };
  cookieIds: string[];
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return runSingleOperation((mongoSession) =>
    mongoDB.collections.sessions.deleteMany(
      {
        cookieId: {
          $in: cookieIds,
        },
      },
      {
        session: mongoSession,
      }
    )
  );
}
