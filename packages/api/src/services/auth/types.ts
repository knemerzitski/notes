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
   * Adds user to list of authenticated users
   */
  addUser(userId: UserId): Promise<AuthenticatedContext>;

  /**
   * Remove user or users from list of authenticated users
   */
  removeUser(userId: UserId | UserId[]): Promise<void>;

  /**
   * Deletes all known authenticated users
   */
  clearAllUsers(): Promise<void>;

  /**
   * If userId is not specified then tries to find first authenticated user.
   *
   * @returns `true` when user is authenticated.
   */
  isAuthenticated(userId?: UserId): Promise<boolean>;

  /**
   * Throws error if user is noth authenticated.
   *
   * If user is not specified then checks for any authenticated users.
   */
  assertAuthenticated(userId?: UserId): Promise<AuthenticatedContext>;

  /**
   * List of all possibly authenticated users.
   */
  getAvailableUserIds(): ObjectId[];
}
