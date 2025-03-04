import { ObjectId } from 'mongodb';
import {
  coerce,
  date,
  Infer,
  InferRaw,
  instance,
  number,
  object,
  optional,
  string,
} from 'superstruct';

import { SelectionRange } from '../../../../collab/src/client/selection-range';

import { CollectionDescription } from '../collections';

import { ChangesetSchema } from './changeset';

const _SelectionRange = object({
  /**
   * Range start value
   */
  start: number(),
  /**
   * If undefined then start === end
   */
  end: optional(number()),
});

export const SelectionRangeSchema = coerce(
  _SelectionRange,
  _SelectionRange,
  (value) => value,
  (value) => SelectionRange.collapseSame(value)
);

export type DBSelectionRangeSchema = InferRaw<typeof SelectionRangeSchema>;

export type SelectionRangeSchema = Infer<typeof SelectionRangeSchema>;

export const CollabRecordSchema = object({
  _id: instance(ObjectId),
  /**
   * This record belongs to specific CollabText
   */
  collabTextId: instance(ObjectId),
  afterSelection: SelectionRangeSchema,
  beforeSelection: SelectionRangeSchema,
  changeset: ChangesetSchema,
  /**
   * When record was inserted to DB
   */
  createdAt: date(),
  creatorUser: object({
    _id: instance(ObjectId),
  }),
  revision: number(),
  userGeneratedId: string(),
});

export type DBCollabRecordSchema = InferRaw<typeof CollabRecordSchema>;

export type CollabRecordSchema = Infer<typeof CollabRecordSchema>;

export const collabRecordDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { collabTextId: 1, revision: 1 },
      sparse: false,
      unique: true,
    },
  ],
};
