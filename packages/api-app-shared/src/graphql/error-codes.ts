export enum GraphQLErrorCode {
  /**
   * User must be authenticated to perform this request.
   */
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  /**
   * Current user lacks permissions to perform this request.
   */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /**
   * Requested resource was not found.
   * Extension key 'resource' for enum {@link ResourceType} value
   */
  NOT_FOUND = 'NOT_FOUND',
  /**
   * Resource is read-only and cannot me modified.
   */
  READ_ONLY = 'READ_ONLY',
  /**
   * Provided input/argument for requesting the resource is invalid.
   */
  INVALID_INPUT = 'INVALID_INPUT',
  /**
   * Unable to process the operation because it would create an invalid state.
   */
  INVALID_OPERATION = 'INVALID_OPERATION',
}

export enum AuthenticationFailedReason {
  /**
   * User has not been defined.
   */
  USER_UNDEFINED = 'USER_UNDEFINED',

  /**
   * Defined user has no session.
   */
  USER_NO_SESSION = 'USER_NO_SESSION',

  /**
   * Session was not found in database.
   */
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

export enum ResourceType {
  NOTE = 'NOTE',
  USER = 'USER',
}
