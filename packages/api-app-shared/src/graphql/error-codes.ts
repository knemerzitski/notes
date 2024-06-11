export enum GraphQLErrorCode {
  /**
   * User must be authenticated to perform this request.
   */
  Unauthenticated = 'UNAUTHENTICATED',
  /**
   * Current user lacks permissions to perform this request.
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
  /**
   * Unable to process the operation because it would create an invalid state.
   */
  InvalidOperation = 'INVALID_OPERATION',
}

export enum AuthenticationFailedReason {
  /**
   * User has not been defined.
   */
  UserUndefined = 'USER_UNDEFINED',

  /**
   * Defined user has no session.
   */
  UserNoSession = 'USER_NO_SESSION',

  /**
   * Session was not found in database.
   */
  SessionExpired = 'SESSION_EXPIRED',
}
