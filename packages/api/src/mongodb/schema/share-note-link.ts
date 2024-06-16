import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../collections';

import { NoteSchema } from './note';
import { UserNoteSchema } from './user-note';

/**
 * Note sharing via links
 */
export interface ShareNoteLinkSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used at access note sharing
   */
  publicId: string;

  sourceUserNote: {
    /**
     * UserNote.id that was used when this link was created
     */
    id: UserNoteSchema['_id'];
  };

  /**
   * Cached note values for quick accces
   */
  note: {
    id: NoteSchema['_id'];
    publicId: NoteSchema['publicId'];
    collabTextIds: NoteSchema['collabTextIds'];
  };

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
