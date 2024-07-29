import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../../collections';
import { CollabTextSchema } from '../collab-text/collab-text';
import { UserNoteSchema } from '../user-note/user-note';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used to access note
   */
  publicId: string;
  /**
   * User who owns this note. Only user that can delete it.
   */
  ownerId: ObjectId;
  /**
   * All UserNotes that are referencing this note
   */
  userNotes: Pick<UserNoteSchema, '_id' | 'userId'>[];
  /**
   * Collaborative editing texts by field name
   * Key is enum value NoteTextField
   */
  collabTexts: Record<string, CollabTextSchema>;
}

export const noteDefaultValues = {
  publicId: () => nanoid(),
};

export const noteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { publicId: 1 },
      unique: true,
    },
  ],
};
