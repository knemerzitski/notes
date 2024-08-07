import { ObjectId } from 'mongodb';

/**
 * User's access to a note with customizations.
 */
export interface UserNoteSchema {
  userId: ObjectId;
  /**
   * Owner can delete the note.
   * @default false
   */
  isOwner?: boolean;
  /**
   * Read-only note text cannot be modified.
   * @default false
   */
  readOnly?: boolean;
  preferences?: {
    backgroundColor?: string;
  };
  category?: {
    /**
     * Category groups similar notes
     *
     * Enum value NoteCategory
     */
    name: string;
  };
}
