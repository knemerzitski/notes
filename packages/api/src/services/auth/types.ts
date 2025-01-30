import { ObjectId } from 'mongodb';

import { QueryableSession } from '../../mongodb/loaders/session/description';
import { objectIdToStr } from '../../mongodb/utils/objectid';

export interface AuthenticatedContext {
  session: QueryableSession;
}

type UserId = NonNullable<Parameters<typeof objectIdToStr>[0]>;

/**
 * Service to manage user authentication
 */
export interface AuthenticationService {
  /**
   * Creates new AuthenticatedContext for a given user
   */
  createAuth(userId: UserId): Promise<AuthenticatedContext>;

  /**
   * Delete authentication contexts by userId
   */
  deleteAuthByUserId(userId: UserId | UserId[]): Promise<void>;

  /**
   * Deletes all known authentication contexts
   */
  deleteAllAuth(): Promise<void>;

  /**
   * @returns `true` when user is authenticated and {@link getAuth} will return a valid context
   */
  isAuthenticated(userId: UserId): Promise<boolean>;

  /**
   * Returns a authenticated context. Throws error if unable
   * to retrieve authenticated context for any reason.
   */
  getAuth(userId: UserId): Promise<AuthenticatedContext>;

  /**
   * Returns first available authenticated context. Throws error if unable
   * to retrieve authenticated context for any reason.
   */
  getFirstAuth(): Promise<AuthenticatedContext>;

  /**
   * List of all available userIds that have a authentication context
   */
  getAvailableUserIds(): ObjectId[];
}
