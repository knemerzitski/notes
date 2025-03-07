import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
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
  if (cookieIds.length === 0) {
    return;
  }

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
