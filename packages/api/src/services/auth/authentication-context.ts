import { ObjectId } from 'mongodb';
import {
  object,
  instance,
  string,
  date,
  coerce,
  number,
  InferRaw,
  Infer,
  union,
  enums,
  defaulted,
  type,
} from 'superstruct';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { objectIdToStr, strToObjectId } from '../../mongodb/utils/objectid';

const strObjectId = coerce(instance(ObjectId), string(), strToObjectId, objectIdToStr);

const timeDate = coerce(
  date(),
  number(),
  (timeNr) => new Date(timeNr),
  (date) => date.getTime()
);

const SerializableQueryableSession = object({
  _id: strObjectId,
  cookieId: string(),
  userId: strObjectId,
  expireAt: timeDate,
});

const AuthenticatedContext = object({
  /**
   * Current active session
   */
  session: SerializableQueryableSession,
});

export type AuthenticatedContext = Infer<typeof AuthenticatedContext>;

const UnauthenticatedContext = object({
  reason: enums(Object.values(AuthenticationFailedReason)),
});

export type UnauthenticatedContext = Infer<typeof UnauthenticatedContext>;

export const AuthenticationContext = union([
  AuthenticatedContext,
  defaulted(UnauthenticatedContext, () => ({
    reason: AuthenticationFailedReason.USER_UNDEFINED,
  })),
]);

export type AuthenticationContext = Infer<typeof AuthenticationContext>;

export class AuthenticatedFailedError extends Error {
  readonly reason: AuthenticationFailedReason;

  constructor(code: AuthenticationFailedReason) {
    super();
    this.reason = code;
  }
}

export type SerializedAuthenticatedContext = InferRaw<typeof AuthenticatedContext>;

export type SerializedAuthenticationContext =
  | SerializedAuthenticatedContext
  | UnauthenticatedContext;
