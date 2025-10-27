import { ObjectId } from 'mongodb';

import {
  array,
  boolean,
  date,
  defaulted,
  Infer,
  InferRaw,
  instance,
  object,
  optional,
  record,
  string,
} from 'superstruct';

import { CollectionDescription } from '../collections';

export const NoteCategorySchema = object({
  /**
   * An ordered list of Note._id's
   */
  noteIds: array(instance(ObjectId)),
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
  note: defaulted(
    defaulted(
      object({
        /**
         * Key is enum value NoteCategory
         */
        categories: defaulted(record(string(), NoteCategorySchema), () => ({})),
      }),
      () => ({})
    ),
    () => ({})
  ),
  /**
   * User used for demo purposes. Gets reset periodically
   */
  demo: optional(
    object({
      /**
       * ID used for demo purposes to identify different demo users
       */
      id: string(),
    })
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
    {
      key: {
        'demo.id': 1,
      },
      unique: true,
      sparse: true,
    },
  ],
};
