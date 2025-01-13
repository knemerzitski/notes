import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { SessionDurationConfig, SessionDuration } from '../session/duration';
import { findByCookieId } from '../session/find-by-cookie-id';
import { tryRefreshExpireAt } from '../session/try-refresh-expire-at';

import { AuthenticatedContext, AuthenticatedFailedError } from './authentication-context';

// TODO test
/**
 * Get session info from database using provided cookieId.
 * Can refresh session if it's about to expire.
 * Leave option undefined not not refresh session.
 */
export async function findRefreshSessionByCookieId(
  cookieId: string,
  {
    mongoDB,
    options,
  }: {
    mongoDB: {
      collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
      loaders: Pick<MongoDBLoaders, 'session'>;
    };
    options?: {
      sessions?: {
        user?: SessionDurationConfig;
      };
    };
  }
): Promise<AuthenticatedContext['session']> {
  const session = await findByCookieId({
    cookieId,
    mongoDB,
  });

  // Session not found in db or expireAt time has passed
  if (!session || session.expireAt.getTime() <= Date.now()) {
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SESSION_EXPIRED);
  }

  if (!options?.sessions?.user) {
    return session;
  }

  const sessionDurationConfig = options.sessions.user;

  // Refresh session
  const newSession = await tryRefreshExpireAt({
    session,
    sessionDuration: new SessionDuration(sessionDurationConfig),
    mongoDB,
  });

  return newSession;
}
