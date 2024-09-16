import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { insertSession as model_insertSession } from '../../mongodb/models/session/insert-session';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { SessionDuration } from './duration';
import { DBSessionSchema, SessionSchema } from '../../mongodb/schema/session';

export interface InsertSessionParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
    loaders: Pick<MongoDBLoaders, 'session'>;
  };
  userId: ObjectId;
  duration: SessionDuration;
}

export async function insertSession({
  mongoDB,
  userId,
  duration,
}: InsertSessionParams): Promise<DBSessionSchema> {
  const session = SessionSchema.create({
    _id: new ObjectId(),
    userId,
    expireAt: duration.newDate(),
  });

  await model_insertSession({
    mongoDB,
    session,
  });

  mongoDB.loaders.session.prime(
    {
      id: {
        cookieId: session.cookieId,
      },
    },
    session,
    {
      valueToQueryOptions: {
        fillStruct: SessionSchema,
      },
    }
  );

  return session;
}
