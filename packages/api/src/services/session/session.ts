import { DBSessionSchema, SessionSchema } from '../../mongodb/schema/session';
import {
  QueryableSessionLoader,
  SessionNotFoundQueryLoaderError,
} from '../../mongodb/loaders/session/loader';
import { Collection, ObjectId } from 'mongodb';
import { SessionDuration } from './duration';
import { create } from 'superstruct';

export interface InsertNewSessionParams {
  userId: ObjectId;
  duration: SessionDuration;
  collection: Collection<DBSessionSchema>;
}

export async function insertNewSession({
  userId,
  collection,
  duration,
}: InsertNewSessionParams): Promise<DBSessionSchema> {
  const newSession = create(
    {
      _id: new ObjectId(),
      userId,
      expireAt: duration.newDate(),
    },
    SessionSchema
  );

  await collection.insertOne(newSession);

  return newSession;
}

export type Session = Pick<DBSessionSchema, '_id' | 'cookieId' | 'expireAt' | 'userId'>;

interface FindByCookieIdParams {
  cookieId: string;
  loader: QueryableSessionLoader;
}

export async function findByCookieId({
  cookieId,
  loader,
}: FindByCookieIdParams): Promise<Session | null> {
  try {
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

    return {
      _id: session._id,
      cookieId: session.cookieId,
      expireAt: session.expireAt,
      userId: session.userId,
    };
  } catch (err) {
    if (err instanceof SessionNotFoundQueryLoaderError) {
      return null;
    }
    throw err;
  }
}

export interface UpdateExpireAtParams {
  sessionId: ObjectId;
  expireAt: Date;
  collection: Collection<DBSessionSchema>;
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
  collection: Collection<DBSessionSchema>;
  sessionDuration: SessionDuration;
  /**
   * Primes session in loader
   */
  prime?: {
    loader: QueryableSessionLoader;
  };
}

export async function tryRefreshExpireAt<
  T extends Pick<Session, '_id' | 'expireAt' | 'cookieId'>,
>({
  session,
  collection,
  sessionDuration,
  prime,
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

  if (prime) {
    prime.loader.prime(
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
      session
    );
  }

  return {
    ...session,
    expireAt: newExpireAt,
  };
}
