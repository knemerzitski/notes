import { ObjectId } from 'mongodb';
import {
  array,
  coerce,
  date,
  Infer,
  instance,
  number,
  object,
  optional,
  string,
  unknown,
} from 'superstruct';

import { Changeset } from '~collab/changeset/changeset';
import { SelectionRange } from '~collab/client/selection-range';

export const ChangesetSchema = coerce(
  instance(Changeset),
  unknown(),
  (value) => Changeset.parseValue(value),
  (changeset) => changeset.serialize()
);

export type ChangesetSchema = Infer<typeof ChangesetSchema>;

export const RevisionChangesetSchema = object({
  changeset: ChangesetSchema,
  revision: number(),
});

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

export type SelectionRangeSchema = Infer<typeof SelectionRangeSchema>;

export const RevisionRecordSchema = object({
  afterSelection: SelectionRangeSchema,
  beforeSelection: coerce(
    SelectionRangeSchema,
    SelectionRangeSchema,
    (value) => value,
    (value) => SelectionRange.collapseSame(value)
  ),
  changeset: ChangesetSchema,
  /**
   * When record was inserted to DB
   */
  createdAt: date(),
  creatorUserId: instance(ObjectId),
  revision: number(),
  userGeneratedId: string(),
});

export type RevisionRecordSchema = Infer<typeof RevisionRecordSchema>;

export const CollabTextSchema = object({
  headText: RevisionChangesetSchema,
  tailText: RevisionChangesetSchema,
  records: array(RevisionRecordSchema),
});

export type CollabTextSchema = Infer<typeof CollabTextSchema>;
