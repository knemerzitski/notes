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
  unknown,
} from 'superstruct';

import { Changeset } from '~collab/changeset';
import { SelectionRange } from '~collab/client/selection-range';

export const ChangesetSchema = coerce(
  instance(Changeset),
  unknown(),
  (value) => Changeset.parseValue(value),
  (changeset) => changeset.serialize()
);

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;

export const RevisionChangesetSchema = object({
  changeset: ChangesetSchema,
  revision: number(),
});

export type DBRevisionChangesetSchema = InferRaw<typeof RevisionChangesetSchema>;

export type RevisionChangesetSchema = Infer<typeof RevisionChangesetSchema>;

export const SelectionRangeSchema = object({
  /**
   * Range start value
   */
  start: number(),
  /**
   * If undefined then start === end
   */
  end: optional(number()),
});

const CollapsedSelectionRangeSchema = coerce(
  SelectionRangeSchema,
  SelectionRangeSchema,
  (value) => value,
  (value) => SelectionRange.collapseSame(value)
);

export type DBSelectionRangeSchema = InferRaw<typeof SelectionRangeSchema>;

export type SelectionRangeSchema = Infer<typeof SelectionRangeSchema>;

export const RevisionRecordSchema = object({
  afterSelection: CollapsedSelectionRangeSchema,
  beforeSelection: CollapsedSelectionRangeSchema,
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

export type DBRevisionRecordSchema = InferRaw<typeof RevisionRecordSchema>;

export type RevisionRecordSchema = Infer<typeof RevisionRecordSchema>;

export const CollabTextSchema = object({
  headText: RevisionChangesetSchema,
  tailText: RevisionChangesetSchema,
  records: array(RevisionRecordSchema),
  /**
   * Time when text was last updated
   */
  updatedAt: date(),
});

export type DBCollabTextSchema = InferRaw<typeof CollabTextSchema>;

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
