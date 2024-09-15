import { ObjectId } from 'mongodb';

import { CollectionDescription } from '../collections';
import {
  array,
  defaulted,
  Infer,
  InferRaw,
  instance,
  object,
  optional,
  record,
  string,
} from 'superstruct';

export const NoteCategorySchema = object({
  /**
   * An ordered list of Note._id
   */
  order: array(instance(ObjectId)),
});

export type DBNoteCategorySchema = InferRaw<typeof NoteCategorySchema>;

export type NoteCategorySchema = Infer<typeof NoteCategorySchema>;

export const UserSchema = object({
  _id: instance(ObjectId),
  /**
   * Any third-party related information
   */
  thirdParty: optional(
    object({
      google: optional(
        object({
          /**
           * Google authentication JWT payload subject field.
           * In other words user ID returned by Google Sign-In.
           */
          id: optional(string()),
        })
      ),
    })
  ),
  profile: object({
    displayName: string(),
  }),
  notes: defaulted(
    defaulted(
      object({
        /**
         * Key is enum value NoteCategory
         */
        category: defaulted(record(string(), NoteCategorySchema), () => ({})),
      }),
      () => ({})
    ),
    () => ({})
  ),
});

export type DBUserSchema = InferRaw<typeof UserSchema>;

export type UserSchema = Infer<typeof UserSchema>;

export const userDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { 'thirdParty.google.id': 1 },
      unique: true,
      sparse: true,
    },
  ],
};
