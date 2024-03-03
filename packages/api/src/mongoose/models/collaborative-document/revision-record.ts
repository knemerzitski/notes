import { Schema } from 'mongoose';

import { RecordValue } from '~collab/adapters/mongodb/multi-field-document-server';
import { Changeset } from '~collab/changeset/changeset';

import { changesetField } from './changeset-field';

export type DBRevisionRecord = RecordValue<Changeset>;

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
