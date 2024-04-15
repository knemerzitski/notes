import { ObjectId } from 'mongodb';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { SessionSchema } from '../mongodb/schema/session/sessions';
import { UserSchema } from '../mongodb/schema/user';

import { ApiGraphQLContext } from './context';
import CookiesContext from './cookies-context';
import { tryRefreshExpireAt } from './session-expiration';


interface SerializedId {
  /**
   * base64 representation of MongoDB ObjectId
   */
  _id: string;
}

type SerializedUser = Omit<User, '_id'> & SerializedId;

type SerializedSession = Omit<Session, '_id' | 'user'> & {
  user: SerializedUser;
} & SerializedId;

interface User extends Omit<UserSchema, 'notes'> {
  _id: ObjectId;
}

interface Session extends Omit<SessionSchema, 'userId' | 'expireAt'> {
  /**
   * base64 representation of MongoDB ObjectId
   */
  _id: ObjectId;
  user: User;
  /**
   * {@link SessionSchema.expireAt} unix timestamp representation
   */
  expireAt: number;
}

export type SerializedAuthenticatedContext = Omit<AuthenticatedContext, 'session'> & {
  session: SerializedSession;
};

export interface AuthenticatedContext {
  /**
   * Current session and the user.
   */
  session: Session;
}

export interface UnauthenticatedContext {
  reason: AuthenticationFailedReason;
}

export type AuthenticationContext = AuthenticatedContext | UnauthenticatedContext;

export type SerializedAuthenticationContext =
  | SerializedAuthenticatedContext
  | UnauthenticatedContext;

export class AuthenticatedFailedError extends Error {
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

export function serializeAuthenticationContext(
  auth: AuthenticationContext
): SerializedAuthenticationContext {
  if (!isAuthenticated(auth)) return auth;

  return {
    ...auth,
    session: {
      ...auth.session,
      _id: auth.session._id.toString('base64'),
      user: {
        ...auth.session.user,
        _id: auth.session.user._id.toString('base64'),
      },
    },
  };
}

export function parseAuthenticationContextValue(
  auth: SerializedAuthenticationContext | undefined
): AuthenticationContext {
  if (!auth) {
    return {
      reason: AuthenticationFailedReason.UserUndefined,
    };
  }

  if ('reason' in auth) return auth;

  return {
    ...auth,
    session: {
      ...auth.session,
      _id: ObjectId.createFromBase64(auth.session._id),
      user: {
        ...auth.session.user,
        _id: ObjectId.createFromBase64(auth.session.user._id),
      },
    },
  };
}

/**
 * Get session and user info from database using provided cookieId.
 * Refreshes session if it's about to expire.
 */
export async function findRefreshDbSession(
  cookieId: string,
  Session: ApiGraphQLContext['mongoose']['model']['Session']
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
    _id: session._id,
    expireAt: expireAt.getTime(),
    user: {
      ...session.user,
      _id: session.user._id,
    },
  };
}

export async function parseAuthFromHeaders(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  cookiesContext: CookiesContext,
  Session: ApiGraphQLContext['mongoose']['model']['Session']
) {
  try {
    if (!headers) {
      return {
        reason: AuthenticationFailedReason.UserUndefined,
      };
    }

    const userId = headers[CustomHeaderName.UserId];
    if (!userId) {
      return {
        reason: AuthenticationFailedReason.UserUndefined,
      };
    }

    const cookieId = cookiesContext.sessions[userId];
    if (!cookieId) {
      return {
        reason: AuthenticationFailedReason.UserNoSession,
      };
    }

    const session = await findRefreshDbSession(cookieId, Session);
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
