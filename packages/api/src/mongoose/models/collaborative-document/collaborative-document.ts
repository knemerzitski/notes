import { Schema } from 'mongoose';

import { DocumentValue } from '~collab/adapters/mongodb/multi-field-document-server';
import { Changeset } from '~collab/changeset/changeset';

import { revisionRecordSchema } from './revision-record';

export type DBCollaborativeDocument = DocumentValue<Changeset>;

export const collaborativeDocumentSchema = new Schema<DBCollaborativeDocument>(
  {
    latestText: {
      type: Schema.Types.String,
      required: true,
    },
    latestRevision: {
      type: Schema.Types.Number,
      required: true,
    },
    records: [revisionRecordSchema],
  },
  {
    _id: false,
  }
);
