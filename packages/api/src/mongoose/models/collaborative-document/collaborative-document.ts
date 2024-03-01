import { Schema } from 'mongoose';

import { DBRevisionRecord, revisionRecordSchema } from './revision-record';

export interface DBCollaborativeDocument {
  latestText: string;
  latestRevision: number;
  records: DBRevisionRecord[];
}

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
