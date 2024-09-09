import { ObjectId } from 'mongodb';
import { object, string, instance, date, Infer, optional, boolean } from 'superstruct';

/**
 * User's access to a note with customizations.
 */
export const NoteUserSchema = object({
  /**
   * User._id reference
   */
  _id: instance(ObjectId),
  /**
   * When user entry was created in note.
   * @default false
   */
  createdAt: date(),
  /**
   * Note owner can change properties of other note users: readOnly or delete user from note.
   * @default false
   */
  isOwner: optional(boolean()),
  /**
   * Read-only note text cannot be modified.
   * @default false
   */
  readOnly: optional(boolean()),
  preferences: optional(
    object({
      backgroundColor: optional(string()),
    })
  ),
  /**
   * User can categorize similar notes. \
   * GraphQL uses enum NoteCategory.
   */
  categoryName: string(),
  trashed: optional(
    object({
      /**
       * Note is marked for deletion for this user.
       * User entry well be deleted after this date.
       * If user is owner then note will deleted for everyone.
       * Uses normal index instead of ttl. Notes are deleted using cron scheduling.
       */
      expireAt: date(),
      /**
       * Category name before note was marked for deletion.
       * Note is kept in a separate category '_trashed' while waiting for deletion.
       */
      originalCategoryName: string(),
    })
  ),
});

export type NoteUserSchema = Infer<typeof NoteUserSchema>;
