import { ObjectId } from 'mongodb';

import {
  array,
  date,
  Infer,
  InferRaw,
  instance,
  number,
  object,
  optional,
  string,
} from 'superstruct';

import { CollectionDescription } from '../collections';

import { SelectionRangeSchema } from './collab-text';

export const OpenNoteSchema = object({
  /**
   * Note that has been opened
   */
  noteId: instance(ObjectId),
  /**
   * User who has opened the note
   */
  userId: instance(ObjectId),
  /**
   * Note collaborative text state
   */
  collabText: optional(
    object({
      /**
       * Current revision user is working in
       */
      revision: number(),
      /**
       * Latest text selection that appliest to collabText at {@link revision}
       */
      latestSelection: SelectionRangeSchema,
    })
  ),
  /**
   * Document expireAtSeconds index
   */
  expireAt: date(),
  /**
   * Note can be opened by multiple clients and every client can start multiple subscriptions.
   */
  clients: array(
    object({
      connectionId: string(),
      subscriptionId: string(),
    })
  ),
});

export type DBOpenNoteSchema = InferRaw<typeof OpenNoteSchema>;

export type OpenNoteSchema = Infer<typeof OpenNoteSchema>;

export const openNoteDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { noteId: 1 },
    },
    {
      // TODO this index is redundant?
      key: { noteId: 1, userId: 1 },
    },
    {
      key: { expireAt: 1 },
      expireAfterSeconds: 0,
    },
  ],
};
