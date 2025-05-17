import { Infer, InferRaw } from 'superstruct';

import { ChangesetStruct } from '../../../../collab2/src';

export const ChangesetSchema = ChangesetStruct;

export type DBChangesetSchema = InferRaw<typeof ChangesetSchema>;

export type ChangesetSchema = Infer<typeof ChangesetSchema>;
