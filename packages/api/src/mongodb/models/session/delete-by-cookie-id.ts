import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';

export function deleteByCookieId({
  mongoDB,
  cookieId,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
  };
  cookieId: string;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  return runSingleOperation((mongoSession) =>
    mongoDB.collections.sessions.deleteMany(
      {
        cookieId,
      },
      {
        session: mongoSession,
      }
    )
  );
}
