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
  /**
   * Server has an unexpected invalid state that should never happen.
   */
  InternalError = 'INTERNAL_ERROR',
}

export enum AuthenticationFailedReason {
  /**
   * Current session key is invalid.
   */
  InvalidCurrentSessionKey = 'INVALID_CURRENT_SESSION_KEY',
  /**
   * Sessions map has an invalid key.
   */
  InvalidSessionsKey = 'INVALID_SESSIONS_KEY',

  /**
   * Sessions map has a invalid session ID.
   */
  InvalidSessionsId = 'INVALID_SESSIONS_ID',
  /**
   * Session was not found in database.
   */
  SessionExpired = 'SESSION_EXPIRED',
}
