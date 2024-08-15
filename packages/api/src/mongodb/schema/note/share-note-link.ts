import { nanoid } from 'nanoid';

import { UserSchema } from '../user/user';

/**
 * Note sharing via links
 */
export interface ShareNoteLinkSchema {
  /**
   * Unique generated ID used to access sharing
   */
  // TODO use ObjectId
  publicId: string;

  /**
   * User who created this link
   */
  creatorUserId: UserSchema['_id'];

  /**
   * Permissions depending on user role
   */
  permissions?: {
    guest?: SimplePermissions;
    user?: SimplePermissions;
  };

  /**
   * Optional delete document  after certain time
   */
  expireAt?: Date;
  /**
   * Optional should delete document when value reaches 0.
   * Access count should be decremented every time document is accessed.
   * Logic is handled in resolvers, not by database.
   */
  expireAccessCount?: number;
}

interface SimplePermissions {
  readOnly?: boolean;
}

export const shareNoteLinkDefaultValues = {
  publicId: () => nanoid(32),
};
