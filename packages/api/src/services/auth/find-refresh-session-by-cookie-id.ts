import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { CollectionName } from '../../mongodb/collections';
import { QueryableSessionLoader } from '../../mongodb/loaders/session/loader';
import { SessionDurationConfig, SessionDuration } from '../session/duration';
import { findByCookieId } from '../session/find-by-cookie-id';
import { tryRefreshExpireAt } from '../session/try-refresh-expire-at';
import { AuthenticatedContext, AuthenticatedFailedError } from './authentication-context';

export interface FindRefreshSessionByCookieIdParams {
  loader: QueryableSessionLoader;
  /**
   * Set null to not refresh session
   */
  sessionDurationConfig?: SessionDurationConfig | null;
}

// TODO test
/**
 * Get session info from database using provided cookieId.
 * Can refresh session if it's about to expire.
 */
export async function findRefreshSessionByCookieId(
  cookieId: string,
  { loader, sessionDurationConfig }: FindRefreshSessionByCookieIdParams
): Promise<AuthenticatedContext['session']> {
  const session = await findByCookieId({
    cookieId,
    mongoDB: {
      loaders: {
        session: loader,
      },
    },
  });

  // Session not found in db or expireAt time has passed
  if (!session || session.expireAt.getTime() <= Date.now()) {
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SESSION_EXPIRED);
  }

  if (!sessionDurationConfig) {
    return session;
  }

  // Refresh session
  const newSession = await tryRefreshExpireAt({
    session,
    sessionDuration: new SessionDuration(sessionDurationConfig),
    mongoDB: {
      collections: {
        [CollectionName.SESSIONS]: loader.context.collections.sessions,
      },
      loaders: {
        session: loader,
      },
    },
  });

  return newSession;
}
