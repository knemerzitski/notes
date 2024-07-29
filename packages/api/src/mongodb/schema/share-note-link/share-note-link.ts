import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../../collections';

import { NoteSchema } from '../note/note';
import { UserNoteSchema } from '../user-note/user-note';

/**
 * Note sharing via links
 */
export interface ShareNoteLinkSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used at access note sharing
   */
  publicId: string;

  /**
   * UserNote tied to creating this link
   */
  sourceUserNote: Pick<UserNoteSchema, '_id'>;

  /**
   * Referenced note
   */
  note: Pick<NoteSchema, '_id' | 'publicId'>;

  /**
   * Permissions depending on user role
   */
  permissions?: {
    guest?: SimplePermissions;
    user?: SimplePermissions;
  };

  /**
   * Optional delete document  after certain time
   */
  expireAt?: Date;
  /**
   * Optional should delete document when value reaches 0.
   * Access count should be decremented every time document is accessed.
   * Logic is handled in resolvers, not by database.
   */
  expireAccessCount?: number;
}

interface SimplePermissions {
  readOnly?: boolean;
}

export const shareNoteLinkDefaultValues = {
  publicId: () => nanoid(),
};

export const shareNoteLinkDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { publicId: 1 },
      unique: true,
    },
    {
      key: { 'sourceUserNote.id': 1 },
    },
    {
      key: { expireAt: 1 },
      expireAfterSeconds: 0,
    },
  ],
};
