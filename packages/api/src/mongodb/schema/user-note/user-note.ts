import { ObjectId } from 'mongodb';

import { CollectionDescription } from '../../collections';

import { NoteSchema } from '../note/note';

/**
 * User's access to a note with customizations.
 */
export interface UserNoteSchema {
  _id: ObjectId;
  userId: ObjectId;
  note: Pick<NoteSchema, '_id' | 'publicId'>;

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

export const userNoteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { userId: 1, 'note.publicId': 1 },
      unique: true,
    },
    {
      key: { 'note.publicId': 1 },
    },
  ],
};
