import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { DBSession } from '../../mongoose/models/session';
import { DBUser } from '../../mongoose/models/user';
import { MongooseGraphQLContext } from '../context';

import { parseCookiesFromHeaders } from './cookies';

const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

const CURRENT_SESSION_KEY_COOKIE_KEY = 'CurrentSessionId';

const SESSIONS_COOKIE_KEY = 'Sessions';

interface User extends Omit<DBUser, 'notes'> {
  /**
   * base64 representation of MongoDB ObjectId
   */
  _id: string;
}

interface Session extends Omit<DBSession, 'userId' | 'expireAt'> {
  /**
   * base64 representation of MongoDB ObjectId
   */
  _id: string;
  user: User;
  /**
   * {@link DBSession.expireAt} unix timestamp representation
   */
  expireAt: number;
}

/**
 * Authenticated user cookies data.
 */
interface ClientCookies {
  /**
   * User.publicId
   */
  currentUserPublicId: string;

  /**
   * Session.cookieId
   * Stored only in http-only cookies. \
   * NEVER send this in a response body.
   */
  currentCookieId: string;
  /**
   * All available sessions for current client.
   *
   * Key is User.publicId \
   * Value is Session.cookieId (NEVER send this in a response body).
   */
  sessions: Record<string, string>;
}

/**
 * Authenticated user related data.
 * This data implementing this interface must be serializable.
 */
export interface AuthenticatedContext {
  /**
   * Data that is stored in client cookies.
   */
  cookie: ClientCookies;

  /**
   * Current session and and the user.
   */
  session: Session;
}

export interface UnauthenticatedContext {
  /**
   * Possible client cookie data.
   */
  cookie?: ClientCookies;
  reason: AuthenticationFailedReason;
}

export type AuthenticationContext = AuthenticatedContext | UnauthenticatedContext;

class AuthenticatedFailedError extends Error {
  readonly reason: AuthenticationFailedReason;

  constructor(code: AuthenticationFailedReason) {
    super();
    this.reason = code;
  }
}

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

export async function findRefreshDbSession(
  cookieId: string,
  Session: MongooseGraphQLContext['mongoose']['model']['Session'],
  tryRefreshExpireAt: (expireAt: Date) => boolean = () => false
): Promise<AuthenticatedContext['session']> {
  const session = await Session.findByCookieId(cookieId);
  if (!session) {
    // Session doesn't exist in database
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SessionExpired);
  }

  // Refresh expireAt it's too low
  const expireAt = new Date(session.expireAt);
  if (tryRefreshExpireAt(expireAt)) {
    await Session.findByIdAndUpdate(session._id, {
      expireAt,
    });
  }

  return {
    ...session,
    _id: session._id.toString('base64'),
    expireAt: expireAt.getTime(),
    user: {
      ...session.user,
      _id: session.user._id.toString('base64'),
    },
  };
}

export function createClientCookies(
  userPublicId: string,
  cookieId: string
): ClientCookies {
  return {
    currentUserPublicId: userPublicId,
    currentCookieId: cookieId,
    sessions: {
      [userPublicId]: cookieId,
    },
  };
}

export function createUpdatedClientCookies(
  auth: AuthenticatedContext,
  userPublicId: string,
  cookieId: string
): ClientCookies {
  return {
    ...auth.cookie,
    currentUserPublicId: userPublicId,
    currentCookieId: cookieId,
    sessions: {
      ...auth.cookie.sessions,
      [userPublicId]: cookieId,
    },
  };
}

/**
 *
 * @param auth
 * @param userPublicId Can be shared in js code.
 * @param cookieId Must remain a http-only cookie.
 * @returns
 */
export function createClientCookiesInsertNewSession(
  auth: AuthenticationContext,
  userPublicId: string,
  cookieId: string
): ClientCookies {
  if (isAuthenticated(auth)) {
    return createUpdatedClientCookies(auth, userPublicId, cookieId);
  } else {
    return createClientCookies(userPublicId, cookieId);
  }
}

export function parseCookies(cookies: Readonly<Record<string, string>>): ClientCookies {
  if (!(CURRENT_SESSION_KEY_COOKIE_KEY in cookies)) {
    throw new AuthenticatedFailedError(
      AuthenticationFailedReason.InvalidCurrentSessionKey
    );
  }
  const currentKey: ClientCookies['currentUserPublicId'] =
    cookies[CURRENT_SESSION_KEY_COOKIE_KEY];

  const sessions: ClientCookies['sessions'] = Object.fromEntries(
    cookies[SESSIONS_COOKIE_KEY]?.split(',').map((session) => {
      const [userPublicId, cookieId] = session.split(':', 2);
      if (!userPublicId) {
        throw new AuthenticatedFailedError(AuthenticationFailedReason.InvalidSessionsKey);
      }
      if (!cookieId) {
        throw new AuthenticatedFailedError(
          AuthenticationFailedReason.InvalidSessionsValue
        );
      }

      return [userPublicId, cookieId];
    }) ?? []
  );

  const currentId = sessions[currentKey];
  if (!currentId) {
    throw new AuthenticatedFailedError(
      AuthenticationFailedReason.InvalidCurrentSessionKey
    );
  }

  return {
    currentUserPublicId: currentKey,
    currentCookieId: currentId,
    sessions,
  };
}

/**
 * @returns new Cookie object that has {@link deleteKey} removed. If {@link deleteKey} is
 * currentKey then new first is picked from existing sessions. Null if no existing sessions remain.
 */
export function createClientCookiesDeleteByKey(
  cookie: ClientCookies,
  deleteKey: string
): ClientCookies | null {
  const newSessions = Object.fromEntries(
    Object.entries(cookie.sessions).filter(([key]) => key !== deleteKey)
  );

  const isNotCurrentKey = deleteKey !== cookie.currentUserPublicId;
  if (isNotCurrentKey) {
    return {
      ...cookie,
      sessions: newSessions,
    };
  }

  const firstKey = Object.keys(newSessions)[0];
  if (!firstKey) {
    return null;
  }

  const firstId = newSessions[firstKey];
  if (!firstId) {
    return null;
  }

  return {
    currentUserPublicId: firstKey,
    currentCookieId: firstId,
    sessions: newSessions,
  };
}

export function clientCookieFilterPublicUserIds(
  cookie: ClientCookies,
  publicUserIds: string[]
): ClientCookies | null {
  const newFilteredSessions = Object.fromEntries(
    Object.entries(cookie.sessions).filter(([key]) => publicUserIds.includes(key))
  );

  const firstKey = Object.keys(newFilteredSessions)[0];
  if (!firstKey) {
    return null;
  }

  const firstId = newFilteredSessions[firstKey];
  if (!firstId) {
    return null;
  }

  return {
    currentUserPublicId: firstKey,
    currentCookieId: firstId,
    sessions: newFilteredSessions,
  };
}

function isNonEmptyStringPair(arr: string[]): arr is [string, string] {
  return (
    typeof arr[0] === 'string' &&
    arr[0].length > 0 &&
    typeof arr[1] === 'string' &&
    arr[1].length > 0
  );
}

export function parseOnlyValidClientCookiesFromHeaders(
  headers: Readonly<Record<string, string | undefined>>
): ClientCookies | null {
  const cookies = parseCookiesFromHeaders(headers);

  let currentUserPublicId: ClientCookies['currentUserPublicId'] | null = null;
  if (CURRENT_SESSION_KEY_COOKIE_KEY in cookies) {
    const parseKey = cookies[CURRENT_SESSION_KEY_COOKIE_KEY];
    if (parseKey.length > 0) {
      currentUserPublicId = parseKey;
    }
  }

  const sessions: ClientCookies['sessions'] = Object.fromEntries(
    cookies[SESSIONS_COOKIE_KEY]?.split(',')
      .map((session) => {
        const [userPublicId = '', cookieId = ''] = session.split(':', 2);
        return [userPublicId, cookieId];
      })
      .filter(isNonEmptyStringPair) ?? []
  );

  if (currentUserPublicId) {
    const currentCookieId = sessions[currentUserPublicId];
    if (currentCookieId) {
      return {
        currentUserPublicId,
        currentCookieId,
        sessions,
      };
    }
  }

  const firstKey = Object.keys(sessions)[0];
  if (!firstKey) {
    return null;
  }

  const firstId = sessions[firstKey];
  if (!firstId) {
    return null;
  }

  return {
    currentUserPublicId: firstKey,
    currentCookieId: firstId,
    sessions,
  };
}

/**
 * Remembers session in http-only cookie. \
 * Assigns 'Set-Cookie' values to {@link multiValueHeaders} to set cookies to match {@link sessionCookie}.
 */
export function headersSetCookieUpdateSessions(
  multiValueHeaders: Record<string, unknown[]>,
  sessionCookie: ClientCookies
) {
  if (!('Set-Cookie' in multiValueHeaders)) {
    multiValueHeaders['Set-Cookie'] = [];
  }
  multiValueHeaders['Set-Cookie'].push(
    `${SESSIONS_COOKIE_KEY}=${Object.entries(sessionCookie.sessions)
      .map(([key, id]) => `${key}:${id}`)
      .join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );
  multiValueHeaders['Set-Cookie'].push(
    `${CURRENT_SESSION_KEY_COOKIE_KEY}=${sessionCookie.currentUserPublicId}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );
}

/**
 * Deletes session from http-only cookie. \
 * Assigns expired 'Set-Cookie' values to {@link multiValueHeaders} to clear relevant cookies.
 */
export function headersSetCookieDeleteSessions(
  multiValueHeaders: Record<string, unknown[]>
) {
  if (!('Set-Cookie' in multiValueHeaders)) {
    multiValueHeaders['Set-Cookie'] = [];
  }

  multiValueHeaders['Set-Cookie'].push(
    `${SESSIONS_COOKIE_KEY}=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  multiValueHeaders['Set-Cookie'].push(
    `${CURRENT_SESSION_KEY_COOKIE_KEY}=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}

/**
 * Get session and user info from database using provided http request headers
 * @param mongoose
 * @param headers
 * @param tryRefreshExpireAt
 * @returns
 */
export async function parseAuthFromHeaders(
  headers: Readonly<Record<string, string | undefined>>,
  Session: MongooseGraphQLContext['mongoose']['model']['Session'],
  tryRefreshExpireAt: (expireAt: Date) => boolean = () => false
): Promise<AuthenticationContext> {
  return parseAuthFromCookies(
    parseCookiesFromHeaders(headers),
    Session,
    tryRefreshExpireAt
  );
}

/**
 * Get session and user info from database using provided cookies
 * @param mongoose
 * @param cookies
 * @param tryRefreshExpireAt
 * @returns
 */
async function parseAuthFromCookies(
  cookies: Readonly<Record<string, string>>,
  Session: MongooseGraphQLContext['mongoose']['model']['Session'],
  tryRefreshExpireAt: (expireAt: Date) => boolean = () => false
): Promise<AuthenticationContext> {
  let sessionCookie: ClientCookies | undefined;
  try {
    sessionCookie = parseCookies(cookies);
    const cookieId = sessionCookie.currentCookieId;

    const session = await findRefreshDbSession(cookieId, Session, tryRefreshExpireAt);

    return {
      session,
      cookie: sessionCookie,
    };
  } catch (err) {
    if (err instanceof AuthenticatedFailedError) {
      return {
        reason: err.reason,
        cookie: sessionCookie,
      };
    } else {
      throw err;
    }
  }
}
