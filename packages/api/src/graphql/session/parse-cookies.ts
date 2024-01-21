import { isArray } from '~utils/isArray';

import { MongooseGraphQLContext } from '../../graphql/context';
import { DBSession } from '../../mongoose/models/session';
import { DBUser } from '../../mongoose/models/user';

interface SessionUser extends Omit<DBUser, 'notes'> {
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
  user: SessionUser;
  /**
   * {@link DBSession.expireAt} unix timestamp representation
   */
  expireAt: number;
}

/**
 * Current user defined by cookie headers
 */
export interface CookieSessionUser {
  /**
   * Current session and it's user.
   * userId is populated with user.
   */
  session: Session;

  cookie: {
    /**
     * Active session index from sessions array
     */
    index: number;
    /**
     * Array of stored sessions that maps to MongoDB session field cookieId
     */
    sessions: string[];
  };
}

/**
 * Get session and user info from database using provided http request headers
 * @param mongoose
 * @param headers
 * @param tryRefreshExpireAt
 * @returns
 */
export async function getSessionUserFromHeaders(
  mongoose: MongooseGraphQLContext['mongoose'],
  headers: Readonly<Record<string, string | undefined>>,
  tryRefreshExpireAt: (expireAt: Date) => boolean = () => false
) {
  return parseSessionUserFromCookies(
    mongoose,
    parseCookiesFromHeaders(headers),
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
async function parseSessionUserFromCookies(
  mongoose: MongooseGraphQLContext['mongoose'],
  cookies: Readonly<Record<string, string>>,
  tryRefreshExpireAt: (expireAt: Date) => boolean = () => false
): Promise<CookieSessionUser | undefined> {
  const { model } = mongoose;

  if (!('CurrentSessionIndex' in cookies)) {
    return; // Undefined CurrentSessionIndex
  }

  const cookieCurrentSessionIndex = Number.parseInt(cookies.CurrentSessionIndex);
  if (Number.isNaN(cookieCurrentSessionIndex) || cookieCurrentSessionIndex < 0) {
    return; // Invalid CurrentSessionIndex
  }

  const cookieSessions = cookies.Sessions?.split(',') ?? [];
  if (!isArray(cookieSessions) || cookieCurrentSessionIndex >= cookieSessions.length) {
    return; // Invalid Sessions or index is too high
  }

  const cookieId = cookieSessions[cookieCurrentSessionIndex];
  if (typeof cookieId !== 'string') {
    return; // cookieId is not string??
  }

  const dbSession = await model.Session.findByCookieId(cookieId);
  if (!dbSession) {
    return; // Session doesn't exist in database
  }

  // Refresh expireAt it's too low
  const expireAt = new Date(dbSession.expireAt);
  if (tryRefreshExpireAt(expireAt)) {
    await model.Session.findByIdAndUpdate(dbSession._id, {
      expireAt,
    });
  }

  const session: CookieSessionUser['session'] = {
    ...dbSession,
    _id: dbSession._id.toString('base64'),
    expireAt: expireAt.getTime(),
    user: {
      ...dbSession.user,
      _id: dbSession.user._id.toString('base64'),
    },
  };

  return {
    session,
    cookie: {
      index: cookieCurrentSessionIndex,
      sessions: cookieSessions,
    },
  };
}

function parseCookiesFromHeaders(headers: Readonly<Record<string, string | undefined>>) {
  if (!('cookie' in headers) || !headers.cookie) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const cookie of headers.cookie.split(';')) {
    const [name, value] = cookie.split('=', 2);
    if (name && value) {
      result[name.trim()] = value.trim();
    }
  }

  return result;
}
