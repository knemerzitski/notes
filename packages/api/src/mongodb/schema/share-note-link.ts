import { boolean, date, Infer, InferRaw, instance, number, object, optional } from 'superstruct';
import { ObjectId } from 'mongodb';

export type DBShareNoteLinkSchema = InferRaw<typeof ShareNoteLinkSchema>;

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
  _id: instance(ObjectId),

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
   * Optional delete share link after certain time
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
