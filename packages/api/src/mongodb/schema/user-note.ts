import { CollectionDescription } from '../collections';
import { NoteSchema } from './note';
import { ObjectId, WithId } from 'mongodb';

/**
 * User's access to a note with customizations.
 */
export interface UserNoteSchema extends WithId<Document> {
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
    collabTextId: NoteSchema['collabTextId'];
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
