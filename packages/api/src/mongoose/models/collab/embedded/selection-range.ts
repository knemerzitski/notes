import { Schema } from 'mongoose';

import { SelectionRange } from '~collab/adapters/mongodb/collaborative-document';

export type DBSelectionRange = SelectionRange;


export const selectionRangeSchema = new Schema<DBSelectionRange>(
  {
    start: {
      type: Schema.Types.Number,
      required: true,
    },
    end: {
      type: Schema.Types.Number,
      required: false,
    },
  },
  {
    _id: false,
  }
);
