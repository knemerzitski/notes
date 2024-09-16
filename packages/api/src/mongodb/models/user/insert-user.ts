import { MongoDBCollections, CollectionName } from '../../collections';
import { TransactionContext } from '../../utils/with-transaction';
import { DBUserSchema, UserSchema } from '../../schema/user';

export async function insertUser({
  mongoDB,
  user,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.USERS>;
  };
  user: UserSchema | DBUserSchema;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  user = UserSchema.createRaw(user);

  return runSingleOperation((session) =>
    mongoDB.collections.users.insertOne(user, {
      session,
    })
  );
}
