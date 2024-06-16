import { ObjectId } from 'mongodb';

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

// TODO use enum from GraphQL?
export enum NoteCategory {
  Default = 'default',
  Sticky = 'sticky',
  Archived = 'archived',
}

interface UserNoteCategoryMeta {
  order: ObjectId[];
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
