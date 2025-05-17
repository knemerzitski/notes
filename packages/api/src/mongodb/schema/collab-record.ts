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
   * This record belongs to specific CollabText
   */
  collabTextId: instance(ObjectId),
  // TODO rename to selection
  afterSelection: SelectionRangeSchema,
  // TODO rename to selectionInverse
  beforeSelection: SelectionRangeSchema,
  changeset: ChangesetSchema,
  inverse: ChangesetSchema,
  /**
   * When record was inserted to DB
   */
  createdAt: date(),
  // TODO rename to author
  creatorUser: object({
    _id: instance(ObjectId),
  }),
  revision: number(),
  // TODO rename to idempotencyId
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
