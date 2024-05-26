export enum GraphQLErrorCode {
  /**
   * User must be authenticated to perform this request.
   */
  Unauthenticated = 'UNAUTHENTICATED',
  /**
   * Current user lacks permission to perform this request.
   */
  Unauthorized = 'UNAUTHORIZED',
  /**
   * Requested resource was not found.
   */
  NotFound = 'NOT_FOUND',
  /**
   * Resource is read-only and cannot me modified.
   */
  ReadOnly = 'READ_ONLY',
  /**
   * Provided input/argument for requesting the resource is invalid.
   */
  InvalidInput = 'INVALID_INPUT',
}

export enum AuthenticationFailedReason {
  /**
   * User has not been defined.
   */
  UserUndefined = 'USER_UNDEFINED', // TODO fixed typo

  /**
   * Defined user has no session.
   */
  UserNoSession = 'USER_NO_SESSION',

  /**
   * Session was not found in database.
   */
  SessionExpired = 'SESSION_EXPIRED',
}
