import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { updateExpireAt } from '../../mongodb/models/session/update-expire-at';
import { SessionSchema } from '../../mongodb/schema/session';

import { SessionDuration } from './duration';

interface TryRefreshExpireAtParams<T extends Pick<SessionSchema, '_id' | 'expireAt'>> {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
    loaders: Pick<MongoDBLoaders, 'session'>;
  };
  session: T;
  sessionDuration: SessionDuration;
}

export async function tryRefreshExpireAt<
  T extends Pick<SessionSchema, '_id' | 'expireAt' | 'cookieId'>,
>({ mongoDB, session, sessionDuration }: TryRefreshExpireAtParams<T>): Promise<T> {
  const newExpireAt = sessionDuration.tryRefreshDate(session.expireAt);
  const isRefreshed = session.expireAt !== newExpireAt;
  if (!isRefreshed) {
    return session;
  }
  await updateExpireAt({
    sessionId: session._id,
    expireAt: newExpireAt,
    mongoDB: mongoDB,
  });

  mongoDB.loaders.session.prime(
    {
      id: {
        cookieId: session.cookieId,
      },
      query: {
        _id: 1,
        expireAt: 1,
      },
    },
    session
  );

  return {
    ...session,
    expireAt: newExpireAt,
  };
}
