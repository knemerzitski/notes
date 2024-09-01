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
   * When user entry was created in note. User with older entry has more permissions over newer one.
   * Only user with oldest createdAt can delete the note. Others can only remove the user entry.
   * @default false
   */
  createdAt: date(),
  /**
   * Read-only note text cannot be modified.
   * @default false
   */
  readonly: optional(boolean()),
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
