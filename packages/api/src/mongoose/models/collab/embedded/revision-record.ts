import { Schema } from 'mongoose';

import { selectionRangeSchema } from './selection-range';
import { RevisionRecord } from '~collab/adapters/mongodb/collaborative-document';
import { changesetField } from './changeset-field';

export type DBRevisionRecord<T = unknown> = RevisionRecord<T>;

export const revisionRecordSchema = new Schema<DBRevisionRecord>(
  {
    creatorUserId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    userGeneratedId: {
      type: Schema.Types.String,
      required: true,
    },
    // TODO index revision?
    revision: {
      type: Schema.Types.Number,
      required: true,
    },
    changeset: changesetField,
    beforeSelection: selectionRangeSchema,
    afterSelection: selectionRangeSchema,
  },
  {
    _id: false,
  }
);
