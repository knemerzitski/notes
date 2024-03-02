import { Schema } from 'mongoose';

import { Changeset } from '~collab/changeset/changeset';

import { changesetField } from './changeset-field';

export interface DBRevisionRecord {
  changeset: Changeset;
  revision: number;
}

export const revisionRecordSchema = new Schema<DBRevisionRecord>(
  {
    changeset: changesetField,
    revision: {
      type: Schema.Types.Number,
      required: true,
    },
  },
  {
    _id: false,
  }
);
