import { ObjectId } from 'mongodb';
import {
  array,
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

import { ChangesetStruct } from '~collab/changeset';
import { SelectionRange } from '~collab/client/selection-range';

export const ChangesetSchema = ChangesetStruct;

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;

export const RevisionChangesetSchema = object({
  changeset: ChangesetSchema,
  revision: number(),
});

export type DBRevisionChangesetSchema = InferRaw<typeof RevisionChangesetSchema>;

export type RevisionChangesetSchema = Infer<typeof RevisionChangesetSchema>;

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

export const CollabTextSchema = object({
  headText: RevisionChangesetSchema,
  tailText: RevisionChangesetSchema,
  records: array(CollabRecordSchema),
  /**
   * Time when text was last updated
   */
  updatedAt: date(),
});

export type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
