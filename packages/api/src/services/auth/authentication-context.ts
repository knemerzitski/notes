import { ObjectId } from 'mongodb';
import { object, instance, string, date, coerce, number, InferRaw } from 'superstruct';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { QueryableSession } from '../../mongodb/loaders/session/description';


import { isAuthenticated } from './is-authenticated';

export type AuthenticationContext = AuthenticatedContext | UnauthenticatedContext;

const base64ObjectId = coerce(
  instance(ObjectId),
  string(),
  (base64Str) => ObjectId.createFromBase64(base64Str),
  (objId) => objId.toString('base64')
);

const timeDate = coerce(
  date(),
  number(),
  (timeNr) => new Date(timeNr),
  (date) => date.getTime()
);

const SerializedQueryableSession = object({
  _id: base64ObjectId,
  cookieId: string(),
  userId: base64ObjectId,
  expireAt: timeDate,
});

export type SerializedQueryableSession = InferRaw<typeof SerializedQueryableSession>;

export interface AuthenticatedContext {
  /**
   * Current active session
   */
  session: QueryableSession;
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
  session: SerializedQueryableSession;
};

// TODO test
export function serializeAuthenticationContext(
  auth: AuthenticationContext
): SerializedAuthenticationContext {
  if (!isAuthenticated(auth)) return auth;

  return {
    ...auth,
    session: SerializedQueryableSession.createRaw(auth.session),
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
    session: SerializedQueryableSession.create(auth.session),
  };
}
