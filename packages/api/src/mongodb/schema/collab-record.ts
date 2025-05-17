import { ObjectId } from 'mongodb';
import { date, Infer, InferRaw, instance, number, object, string } from 'superstruct';

import { SelectionStruct } from '../../../../collab2/src';
import { CollectionDescription } from '../collections';

import { ChangesetSchema } from './changeset';

// TODO rename to SelectionSchema
export const SelectionRangeSchema = SelectionStruct;

export type DBSelectionRangeSchema = InferRaw<typeof SelectionRangeSchema>;

export type SelectionRangeSchema = Infer<typeof SelectionRangeSchema>;

export const CollabRecordSchema = object({
  _id: instance(ObjectId),
  /**
   * User who created the record
   */
  authorId: instance(ObjectId),
  /**
   * This record belongs to specific CollabText
   */
  collabTextId: instance(ObjectId),
  idempotencyId: string(),
  revision: number(),
  changeset: ChangesetSchema,
  inverse: ChangesetSchema,
  selectionInverse: SelectionRangeSchema,
  selection: SelectionRangeSchema,
  /**
   * When record was inserted to DB
   */
  createdAt: date(),
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
