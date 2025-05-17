import { Infer, InferRaw, number, object } from 'superstruct';

import { ChangesetStruct } from '../../../../collab2/src';

export const ChangesetSchema = ChangesetStruct;

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;

// TODO rename to TextRecordSchema
export const RevisionChangesetSchema = object({
  // TODO rename to text and use plain string type
  changeset: ChangesetSchema,
  revision: number(),
});

export type DBRevisionChangesetSchema = InferRaw<typeof RevisionChangesetSchema>;

export type RevisionChangesetSchema = Infer<typeof RevisionChangesetSchema>;
