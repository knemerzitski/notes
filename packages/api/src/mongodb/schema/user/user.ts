import { ObjectId } from 'mongodb';

import { CollectionDescription } from '../../collections';

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
    /**
     * Key is enum value NoteCategory
     */
    category: Record<string, Category>;
  };
}

interface Category {
  /**
   * An ordered list of Note._id
   */
  order: ObjectId[];
}

// TODO move to services?
/**
 *
 * @param category Enum value NoteCategory
 * @returns
 */
export function getNotesArrayPath(category: string) {
  return `notes.category.${category}.order`;
}

export const userDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { 'thirdParty.google.id': 1 },
      unique: true,
      sparse: true,
    },
  ],
};
