import { Schema, SchemaTypeOptions } from 'mongoose';

import { Changeset } from '~op-transform/changeset/changeset';

export interface DBChangeset {
  changeset: Changeset;
}

export const changesetField: SchemaTypeOptions<Changeset> = {
  type: Schema.Types.Mixed,
  required: true,
  get(value: unknown) {
    return Changeset.parseValue(value);
  },
  set(value: Changeset) {
    return value.serialize();
  },
  default() {
    return Changeset.EMPTY;
  },
};
