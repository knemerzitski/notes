import { SessionSchema } from '../../mongodb/schema/session/session';
import { QueryableSessionLoader } from '../../mongodb/loaders/queryable-session-loader';
import { Collection, ObjectId } from 'mongodb';
import { SessionDuration } from './session-duration';

export type Session = Pick<SessionSchema, '_id' | 'cookieId' | 'expireAt' | 'userId'>;

interface FindByCookieIdParams {
  cookieId: string;
  loader: QueryableSessionLoader;
}

export async function findByCookieId({
  cookieId,
  loader,
}: FindByCookieIdParams): Promise<Session | null> {
  const session = await loader.load({
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

  if (!session?._id || !session.cookieId || !session.expireAt || !session.userId) {
    return null;
  }

  return {
    _id: session._id,
    cookieId: session.cookieId,
    expireAt: session.expireAt,
    userId: session.userId,
  };
}

interface UpdateExpireAtParams {
  sessionId: ObjectId;
  expireAt: Date;
  collection: Collection<SessionSchema>;
}

/**
 * Updates session expireAt database
 */
export function updateExpireAt({
  sessionId,
  expireAt,
  collection,
}: UpdateExpireAtParams) {
  return collection.findOneAndUpdate(
    {
      _id: sessionId,
    },
    {
      $set: {
        expireAt,
      },
    }
  );
}

interface TryRefreshExpireAtParams<T extends Pick<Session, '_id' | 'expireAt'>> {
  session: T;
  collection: Collection<SessionSchema>;
  sessionDuration: SessionDuration;
}

export async function tryRefreshExpireAt<T extends Pick<Session, '_id' | 'expireAt'>>({
  session,
  collection,
  sessionDuration,
}: TryRefreshExpireAtParams<T>): Promise<T> {
  const newExpireAt = sessionDuration.tryRefreshDate(session.expireAt);
  const isRefreshed = session.expireAt !== newExpireAt;
  if (!isRefreshed) {
    return session;
  }

  await updateExpireAt({
    sessionId: session._id,
    expireAt: newExpireAt,
    collection,
  });

  return {
    ...session,
    expireAt: newExpireAt,
  };
}

interface PrimeSessionParams {
  session: Session;
  loader: QueryableSessionLoader;
}

/**
 * Primes all known session values
 */
export function primeSession({ session, loader }: PrimeSessionParams) {
  loader.prime(
    {
      id: {
        cookieId: session.cookieId,
      },
      query: {
        _id: 1,
        cookieId: 1,
        expireAt: 1,
        userId: 1,
      },
    },
    session,
    { clearCache: true }
  );
}
