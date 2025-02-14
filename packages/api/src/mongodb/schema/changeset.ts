import { Infer, InferRaw, number, object } from 'superstruct';

import { ChangesetStruct } from '~collab/changeset';

export const ChangesetSchema = ChangesetStruct;

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;

export const RevisionChangesetSchema = object({
  changeset: ChangesetSchema,
  revision: number(),
});

export type DBRevisionChangesetSchema = InferRaw<typeof RevisionChangesetSchema>;

export type RevisionChangesetSchema = Infer<typeof RevisionChangesetSchema>;
