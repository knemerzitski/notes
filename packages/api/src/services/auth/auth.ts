import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { findByCookieId, primeSession, Session, tryRefreshExpireAt } from '../session/session';
import { ReplaceDeep } from '~utils/types';
import { ObjectId } from 'mongodb';
import { QueryableSessionLoader } from '../../mongodb/loaders/queryable-session-loader';
import { Cookies } from '../http/cookies';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { SessionDuration, SessionDurationConfig } from '../session/duration';

export type AuthenticationContext = AuthenticatedContext | UnauthenticatedContext;

export interface AuthenticatedContext {
  /**
   * Current active session
   */
  session: Session;
}

export interface UnauthenticatedContext {
  reason: AuthenticationFailedReason;
}

export class AuthenticatedFailedError extends Error {
  readonly reason: AuthenticationFailedReason;

  constructor(code: AuthenticationFailedReason) {
    super();
    this.reason = code;
  }
}

export type SerializedAuthenticationContext =
  | SerializedAuthenticatedContext
  | UnauthenticatedContext;

export type SerializedAuthenticatedContext = Omit<AuthenticatedContext, 'session'> & {
  session: SerializedSession;
};

/**
 * Replaces ObjectId with base64 representation string.
 */
type SerializedSession = ReplaceDeep<
  ReplaceDeep<Session, ObjectId, string>,
  Date,
  number
>;

export function isAuthenticated(
  auth: AuthenticationContext | undefined
): auth is AuthenticatedContext {
  return !!auth && !('reason' in auth);
}

export function isUnauthenticated(
  auth: AuthenticationContext | undefined
): auth is UnauthenticatedContext {
  return !!auth && 'reason' in auth;
}

export interface ParseAuthenticationContextFromHeadersParams {
  headers?: Readonly<Record<string, string | undefined>> | undefined;
  cookies: Cookies;
  sessionParams: FindRefreshSessionByCookieIdParams;
}

export async function parseAuthenticationContextFromHeaders({
  headers,
  cookies,
  sessionParams,
}: ParseAuthenticationContextFromHeadersParams) {
  try {
    if (!headers) {
      return {
        reason: AuthenticationFailedReason.USER_UNDEFINED,
      };
    }

    const userId = headers[CustomHeaderName.USER_ID];
    if (!userId) {
      return {
        reason: AuthenticationFailedReason.USER_UNDEFINED,
      };
    }

    const cookieId = cookies.sessions[userId];
    if (!cookieId) {
      return {
        reason: AuthenticationFailedReason.USER_NO_SESSION,
      };
    }

    const session = await findRefreshSessionByCookieId(cookieId, sessionParams);
    return {
      session,
    };
  } catch (err) {
    if (err instanceof AuthenticatedFailedError) {
      return {
        reason: err.reason,
      };
    } else {
      throw err;
    }
  }
}

interface FindRefreshSessionByCookieIdParams {
  loader: QueryableSessionLoader;
  /**
   * Set null to not refresh session
   */
  sessionDurationConfig?: SessionDurationConfig | null;
}

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
    loader: loader,
  });

  // Session not found in db or expireAt time has passed
  if (!session || Date.now() <= session.expireAt.getTime()) {
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SESSION_EXPIRED);
  }

  if (!sessionDurationConfig) {
    return session;
  }

  // Refresh session
  const newSession = await tryRefreshExpireAt({
    session,
    collection: loader.context.collections.sessions,
    sessionDuration: new SessionDuration(sessionDurationConfig),
  });
  const isSessionRefreshed = newSession !== session;
  if (isSessionRefreshed) {
    primeSession({ session: newSession, loader });
  }

  return newSession;
}

export function serializeAuthenticationContext(
  auth: AuthenticationContext
): SerializedAuthenticationContext {
  if (!isAuthenticated(auth)) return auth;

  return {
    ...auth,
    session: {
      ...auth.session,
      _id: auth.session._id.toString('base64'),
      userId: auth.session._id.toString('base64'),
      expireAt: auth.session.expireAt.getTime(),
    },
  };
}

export function parseAuthenticationContext(
  auth: SerializedAuthenticationContext | undefined
): AuthenticationContext {
  if (!auth) {
    return {
      reason: AuthenticationFailedReason.USER_UNDEFINED,
    };
  }

  if ('reason' in auth) return auth;

  return {
    ...auth,
    session: {
      ...auth.session,
      _id: ObjectId.createFromBase64(auth.session._id),
      userId: ObjectId.createFromBase64(auth.session.userId),
      expireAt: new Date(auth.session.expireAt),
    },
  };
}
