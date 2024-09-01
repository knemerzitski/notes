import { nanoid } from 'nanoid';

import {
  boolean,
  date,
  defaulted,
  Infer,
  instance,
  number,
  object,
  optional,
  string,
} from 'superstruct';
import { ObjectId } from 'mongodb';

/**
 * Note sharing via links
 */
export type ShareNoteLinkSchema = Infer<typeof ShareNoteLinkSchema>;

const SimplePermissionsSchema = object({
  readOnly: optional(boolean()),
});

/**
 * Note sharing via links
 */
export const ShareNoteLinkSchema = object({
  /**
   * Unique generated ID used to access sharing
   */
  // TODO use ObjectId
  publicId: defaulted(string(), () => nanoid(32)),

  /**
   * User who created this link
   */
  creatorUserId: instance(ObjectId),
  /**
   * Permissions depending on user role
   */
  permissions: optional(
    object({
      guest: optional(SimplePermissionsSchema),
      user: optional(SimplePermissionsSchema),
    })
  ),

  /**
   * Optional delete document  after certain time
   */
  expireAt: optional(date()),
  /**
   * Optional should delete document when value reaches 0.
   * Access count should be decremented every time document is accessed.
   * Logic is handled in resolvers, not by database.
   */
  expireAccessCount: optional(number()),
});

type SimplePermissionsSchema = Infer<typeof SimplePermissionsSchema>;
