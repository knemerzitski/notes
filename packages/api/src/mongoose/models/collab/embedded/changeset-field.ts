import { Schema, SchemaTypeOptions } from 'mongoose';

import { Changeset } from '~collab/changeset/changeset';

export type DBChangeset = Changeset;

export const changesetField: SchemaTypeOptions<Changeset> = {
  type: Schema.Types.Mixed,
  required: true,
  get(value: unknown) {
    return Changeset.parseValue(value);
  },
  set(value: unknown) {
    if(value instanceof Changeset){
      return value.serialize();
    }
    return value;
  },
  default() {
    return Changeset.EMPTY;
  },
};
