import { nanoid } from 'nanoid';

import { UserNoteSchema } from '../user-note/user-note';

/**
 * Note sharing via links
 */
export interface ShareNoteLinkSchema {
  /**
   * Unique generated ID used to access sharing
   */
  publicId: string;

  /**
   * User who created this link
   */
  creatorUserId: UserNoteSchema['_id'];

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
  publicId: () => nanoid(),
};
