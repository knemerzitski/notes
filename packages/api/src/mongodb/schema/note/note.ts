import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../../collections';
import { CollabTextSchema } from '../collab-text/collab-text';

import { ShareNoteLinkSchema } from './share-note-link';
import { UserNoteSchema } from './user-note';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used to access note
   */
  publicId: string;
  /**
   * User specific info for this note
   */
  userNotes: UserNoteSchema[];
  /**
   * Collaborative editing texts by field name
   * Key is enum value NoteTextField
   */
  collabTexts: Record<string, CollabTextSchema>;
  /**
   * Note sharing via links
   */
  shareNoteLinks?: ShareNoteLinkSchema[];
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
    {
      key: { 'userNotes.userId': 1, publicId: 1 },
      unique: true,
    },
    {
      key: { 'shareNoteLinks.publicId': 1 },
      sparse: true,
      unique: true,
    },
  ],
};
