import { MongoDBLoaders } from '../../mongodb/loaders';
import { QueryableSession } from '../../mongodb/loaders/session/description';
import { SessionNotFoundQueryLoaderError } from '../../mongodb/loaders/session/loader';
import { QueryResultDeep } from '../../mongodb/query/query';

interface FindByCookieIdParams {
  cookieId: string;
  mongoDB: {
    loaders: Pick<MongoDBLoaders, 'session'>;
  };
}

export async function findByCookieId({
  cookieId,
  mongoDB,
}: FindByCookieIdParams): Promise<QueryResultDeep<QueryableSession> | null> {
  try {
    const session = await mongoDB.loaders.session.load({
      id: {
        cookieId,
      },
      query: {
        _id: 1,
        cookieId: 1,
        expireAt: 1,
        userId: 1,
      },
    });

    return session;
  } catch (err) {
    if (err instanceof SessionNotFoundQueryLoaderError) {
      return null;
    }
    throw err;
  }
}
