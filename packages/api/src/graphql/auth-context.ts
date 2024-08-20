import { ObjectId } from 'mongodb';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { ReplaceDeep } from '~utils/types';

import { CollectionName } from '../mongodb/collections';
import { findByCookieId } from '../mongodb/schema/session/operations/find-by-cookie-id';
import { SessionSchema } from '../mongodb/schema/session/session';
import { UserSchema } from '../mongodb/schema/user/user';
import { sessionExpiration } from '../session-expiration/mongodb-user-session';

import { ApiGraphQLContext } from './context';
import { CookiesContext } from './cookies-context';

/**
 * Replaces ObjectId with base64 representation string.
 */
type SerializedSession = ReplaceDeep<Session, ObjectId, string>;

type User = Omit<UserSchema, 'notes'>;

export interface Session extends Omit<SessionSchema, 'userId' | 'expireAt'> {
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
      reason: AuthenticationFailedReason.USER_UNDEFINED,
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
  collections: Pick<
    ApiGraphQLContext['mongodb']['collections'],
    CollectionName.USERS | CollectionName.SESSIONS
  >
): Promise<AuthenticatedContext['session']> {
  const session = await findByCookieId({
    cookieId,
    sessionsCollection: collections.sessions,
    usersCollectionName: collections.users.collectionName,
  });

  if (!session) {
    // Session doesn't exist in database
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SESSION_EXPIRED);
  }

  // Refresh expireAt it's too low
  const expireAt = new Date(session.expireAt);
  if (sessionExpiration.tryRefreshExpireAtDate(expireAt)) {
    await collections.sessions.findOneAndUpdate(
      {
        _id: session._id,
      },
      {
        $set: {
          expireAt,
        },
      }
    );
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
  collections: Pick<
    ApiGraphQLContext['mongodb']['collections'],
    CollectionName.USERS | CollectionName.SESSIONS
  >
) {
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

    const cookieId = cookiesContext.sessions[userId];
    if (!cookieId) {
      return {
        reason: AuthenticationFailedReason.USER_NO_SESSION,
      };
    }

    const session = await findRefreshDbSession(cookieId, collections);
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
