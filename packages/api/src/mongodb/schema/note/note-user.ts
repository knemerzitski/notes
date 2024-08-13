import { ObjectId } from 'mongodb';

/**
 * User's access to a note with customizations.
 */
export interface NoteUserSchema {
  /**
   * User._id reference
   */
  _id: ObjectId;
  /**
   * When user entry was created in note. User with older entry has more permissions over newer one.
   * Only user with oldest createdAt can delete the note. Others can only remove the user entry.
   * @default false
   */
  createdAt: Date;
  /**
   * Read-only note text cannot be modified.
   * @default false
   */
  readOnly?: boolean;
  preferences?: {
    backgroundColor?: string;
  };
  /**
   * User can categorize similar notes. \
   * GraphQL uses enum NoteCategory.
   * @default 'dangling'
   */
  categoryName: string;

  trashed?: {
    /**
     * Note is marked for deletion for this user.
     * User entry well be deleted after this date.
     * If user is owner then note will deleted for everyone.
     * Uses normal index instead of ttl. Notes are deleted using cron scheduling.
     */
    expireAt: Date;
    /**
     * Category name before note was marked for deletion.
     * Note is kept in a separate category '_trashed' while waiting for deletion.
     */
    originalCategoryName: string;
  };
}
