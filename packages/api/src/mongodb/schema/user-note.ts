import { CollectionDescription } from '../collections';
import { NoteSchema } from './note';
import { ObjectId } from 'mongodb';

/**
 * User's access to a note with customizations.
 */
export interface UserNoteSchema {
  _id: ObjectId;
  userId: ObjectId;
  /**
   * @default false
   */
  readOnly?: boolean;
  preferences?: {
    backgroundColor?: string;
  };

  note: {
    id: ObjectId;
    publicId: NoteSchema['publicId'];
    collabTextIds: NoteSchema['collabTextIds'];
  };
}

export const userNoteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { userId: 1, 'note.publicId': 1 },
      unique: true,
    },
  ],
};
