import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { NoteTextField } from '../../graphql/types.generated';
import { CollectionDescription } from '../collections';

export interface NoteSchema {
  _id: ObjectId;
  /**
   * Unique generated ID used to access note
   */
  publicId: string;
  ownerId: ObjectId;
  collabTextIds: { [key in NoteTextField]?: ObjectId };
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
