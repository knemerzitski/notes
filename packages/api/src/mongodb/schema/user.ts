import { ObjectId } from 'mongodb';

import { NoteCategory } from '../../graphql/types.generated';
import { CollectionDescription } from '../collections';

export interface UserSchema {
  _id: ObjectId;
  /**
   * Any third-party related information
   */
  thirdParty?: {
    google?: {
      /**
       * Google authentication JWT payload subject field.
       * In other words user ID returned by Google Sign-In.
       */
      id?: string;
    };
  };
  profile: {
    displayName: string;
  };
  notes: {
    category: Record<NoteCategory, UserNoteCategoryMeta>;
  };
}

interface UserNoteCategoryMeta {
  order: ObjectId[];
}

export function getNotesArrayPath(category: NoteCategory) {
  return `notes.category.${category}.order`;
}

export const userDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { 'thirdParty.google.id': 1 },
      unique: true,
      sparse: true,
    },
    ...Object.values(NoteCategory).map((category) => {
      return {
        key: { [`notes.category.${category}.order`]: 1 },
      };
    }),
  ],
};
