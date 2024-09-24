import { ObjectId } from 'mongodb';

import { CollectionDescription } from '../collections';
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
import { SelectionRangeSchema } from './collab-text';

export const NoteEditingSchema = object({
  /**
   * Note that is being edited
   */
  noteId: instance(ObjectId),
  /**
   * User who is editing the note
   */
  userId: instance(ObjectId),
  /**
   * Note collaborative text editing state
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
   * An array of unique connection ids. User can edit note using multiple connections at the same time.
   */
  connectionIds: array(string()),
});

export type DBNoteEditingSchema = InferRaw<typeof NoteEditingSchema>;

export type NoteEditingSchema = Infer<typeof NoteEditingSchema>;

export const noteEditingDescription: CollectionDescription = {
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
