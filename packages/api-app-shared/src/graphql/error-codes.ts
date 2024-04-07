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
  /**
   * Requested more data from array than is available. Some array elements are null.
   */
  ArrayElementNull = 'ARRAY_ELEMENT_NULL',
}

export enum AuthenticationFailedReason {
  /**
   * User has not been defined.
   */
  UserUndefined = 'USER_UNEDFINED',

  /**
   * Defined user has no session.
   */
  UserNoSession = 'USER_NO_SESSION',

  /**
   * Session was not found in database.
   */
  SessionExpired = 'SESSION_EXPIRED',
}
