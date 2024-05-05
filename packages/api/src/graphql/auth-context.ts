import { ObjectId } from 'mongodb';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { SessionSchema } from '../mongodb/schema/session/sessions';
import { UserSchema } from '../mongodb/schema/user';

import { ApiGraphQLContext } from './context';
import CookiesContext from './cookies-context';
import { DeepReplace } from '~utils/types';
import { CollectionName } from '../mongodb/collections';
import findByCookieId from '../mongodb/schema/session/operations/findByCookieId';
import { sessionExpiration } from '../session-expiration/mongodb-user-session';

/**
 * Replaces ObjectId with base64 representation string.
 */
type SerializedSession = DeepReplace<Session, ObjectId, string>;

type User = Omit<UserSchema, 'notes'>;

interface Session extends Omit<SessionSchema, 'userId' | 'expireAt'> {
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
  collections: Pick<
    ApiGraphQLContext['mongodb']['collections'],
    CollectionName.Users | CollectionName.Sessions
  >
): Promise<AuthenticatedContext['session']> {
  const session = await findByCookieId({
    cookieId,
    sessionsCollection: collections[CollectionName.Sessions],
    usersCollectionName: collections[CollectionName.Users].collectionName,
  });

  if (!session) {
    // Session doesn't exist in database
    throw new AuthenticatedFailedError(AuthenticationFailedReason.SessionExpired);
  }

  // Refresh expireAt it's too low
  const expireAt = new Date(session.expireAt);
  if (sessionExpiration.tryRefreshExpireAtDate(expireAt)) {
    await collections[CollectionName.Sessions].findOneAndUpdate(
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
    CollectionName.Users | CollectionName.Sessions
  >
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
