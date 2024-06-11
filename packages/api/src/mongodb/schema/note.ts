import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../collections';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used to access note
   */
  publicId: string;
  ownerId: ObjectId;
  collabTextIds: Record<string, ObjectId>;
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
