import { MongoDBCollections, CollectionName } from '../../collections';
import { DBSessionSchema, SessionSchema } from '../../schema/session';
import { TransactionContext } from '../../utils/with-transaction';

export function insertSession({
  mongoDB,
  session,
}: {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
  };
  session: SessionSchema | DBSessionSchema;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  session = SessionSchema.createRaw(session);

  return runSingleOperation((mongoSession) =>
    mongoDB.collections.sessions.insertOne(session, {
      session: mongoSession,
    })
  );
}
