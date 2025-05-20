import { Infer, InferRaw } from 'superstruct';

import { ChangesetStruct } from '../../../../collab/src';

export const ChangesetSchema = ChangesetStruct;

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;
