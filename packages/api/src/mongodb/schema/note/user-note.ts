import { ObjectId } from 'mongodb';

/**
 * User's access to a note with customizations.
 */
export interface UserNoteSchema {
  userId: ObjectId;

  /**
   * @default false
   */
  readOnly?: boolean;
  preferences?: {
    backgroundColor?: string;
  };

  category?: {
    /**
     * Enum value NoteCategory
     */
    name: string;
  };
}
