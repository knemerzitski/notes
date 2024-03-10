import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { DBSession } from '../../mongoose/models/session';
import { DBUser } from '../../mongoose/models/user';
import { MongooseGraphQLContext } from '../context';

import { parseCookiesFromHeaders } from './cookies';

const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

const CURRENT_SESSION_KEY_COOKIE_KEY = 'CurrentSessionKey';

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
interface Cookie {
  /**
   * Current session key used by client.
   * It's used to keep client and server session in sync.
   */
  currentKey: string;

  /**
   * Current session Id. This is stored only in http-only cookies. \
   * NEVER send this value to client as part of response.
   */
  currentId: string;
  /**
   * All available sessions for current client.
   *
   * Key is currentKey \
   * Value is currentId
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
  cookie: Cookie;

  /**
   * Current session and and the user.
   */
  session: Session;
}

export interface UnauthenticatedContext {
  reason: AuthenticationFailedReason;
}

// TODO rename CookieSession to AuthenticationContext
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

// TODO remove
// export function generateCookieKey() {
//   return nanoid(6);
// }

export function createCookie(key: string, id: string): Cookie {
  // TODO remove
  // const key = generateCookieKey();

  return {
    currentKey: key,
    currentId: id,
    sessions: {
      [key]: id,
    },
  };
}

export function createUpdatedCookie(
  auth: AuthenticatedContext,
  key: string,
  id: string

  // TODO remove
  // attempts = 10
): Cookie {
  // TODO remove
  // Attempt to generate a unique random string a few times, it should never fail.
  // let key: string | null = null;
  // let i = 0;
  // while (i < attempts) {
  //   key = generateCookieKey();
  //   if (!(key in existingSessions)) {
  //     break;
  //   }
  //   i++;
  // }
  // if (key === null) {
  //   throw new Error(`CRITICAL FAILURE! Couldn't generate key for cookie.`);
  // }

  return {
    ...auth.cookie,
    currentKey: key,
    currentId: id,
    sessions: {
      ...auth.cookie.sessions,
      [key]: id,
    },
  };
}

/**
 *
 * @param auth
 * @param key Can be shared in js code.
 * @param id Must remain a http-only cookie.
 * @returns
 */
export function createCookieInsertNewSession(
  auth: AuthenticationContext,
  key: string,
  id: string
): Cookie {
  if (isAuthenticated(auth)) {
    return createUpdatedCookie(auth, key, id);
  } else {
    return createCookie(key, id);
  }
}

export function parseSessionCookie(cookies: Readonly<Record<string, string>>): Cookie {
  if (!(CURRENT_SESSION_KEY_COOKIE_KEY in cookies)) {
    throw new AuthenticatedFailedError(
      AuthenticationFailedReason.InvalidCurrentSessionKey
    );
  }
  const currentKey: Cookie['currentKey'] = cookies[CURRENT_SESSION_KEY_COOKIE_KEY];

  const sessions: Cookie['sessions'] = Object.fromEntries(
    cookies[SESSIONS_COOKIE_KEY]?.split(',').map((session) => {
      const [key, id] = session.split(':', 2);
      if (!key) {
        throw new AuthenticatedFailedError(AuthenticationFailedReason.InvalidSessionsKey);
      }
      if (!id) {
        throw new AuthenticatedFailedError(AuthenticationFailedReason.InvalidSessionsId);
      }

      return [key, id];
    }) ?? []
  );

  const currentId = sessions[currentKey];
  if (!currentId) {
    throw new AuthenticatedFailedError(
      AuthenticationFailedReason.InvalidCurrentSessionKey
    );
  }

  return {
    currentKey,
    currentId,
    sessions,
  };
}

/**
 * @returns new Cookie object that has {@link deleteKey} removed. If {@link deleteKey} is
 * currentKey then new first is picked from existing sessions. Null if no existing sessions remain.
 */
export function createCookieDeleteByKey(
  cookie: Cookie,
  deleteKey: string
): Cookie | null {
  const newSessions = Object.fromEntries(
    Object.entries(cookie.sessions).filter(([key]) => key !== deleteKey)
  );

  const isNotCurrentKey = deleteKey !== cookie.currentKey;
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
    currentKey: firstKey,
    currentId: firstId,
    sessions: newSessions,
  };
}

export function cookieFilterKeys(cookie: Cookie, keys: string[]): Cookie | null {
  const newFilteredSessions = Object.fromEntries(
    Object.entries(cookie.sessions).filter(([key]) => keys.includes(key))
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
    currentKey: firstKey,
    currentId: firstId,
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

export function parseOnlyValidCookiesFromHeaders(
  headers: Readonly<Record<string, string | undefined>>
): Cookie | null {
  const cookies = parseCookiesFromHeaders(headers);

  let currentKey: Cookie['currentKey'] | null = null;
  if (CURRENT_SESSION_KEY_COOKIE_KEY in cookies) {
    const parseKey = cookies[CURRENT_SESSION_KEY_COOKIE_KEY];
    if (parseKey.length > 0) {
      currentKey = parseKey;
    }
  }

  const sessions: Cookie['sessions'] = Object.fromEntries(
    cookies[SESSIONS_COOKIE_KEY]?.split(',')
      .map((session) => {
        const [key = '', id = ''] = session.split(':', 2);
        return [key, id];
      })
      .filter(isNonEmptyStringPair) ?? []
  );

  if (currentKey) {
    const currentId = sessions[currentKey];
    if (currentId) {
      return {
        currentKey: currentKey,
        currentId,
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
    currentKey: firstKey,
    currentId: firstId,
    sessions,
  };
}

/**
 * Remembers session in http-only cookie. \
 * Assigns 'Set-Cookie' values to {@link multiValueHeaders} to set cookies to match {@link sessionCookie}.
 */
export function headersSetCookieUpdateSessions(
  multiValueHeaders: Record<string, unknown[]>,
  sessionCookie: Cookie
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
    `${CURRENT_SESSION_KEY_COOKIE_KEY}=${sessionCookie.currentKey}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
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
  try {
    const sessionCookie = parseSessionCookie(cookies);
    const cookieId = sessionCookie.currentId;

    const session = await findRefreshDbSession(cookieId, Session, tryRefreshExpireAt);

    return {
      session,
      cookie: sessionCookie,
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
