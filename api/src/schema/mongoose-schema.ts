import { randomUUID } from 'crypto';

import { Schema } from 'mongoose';

export const mongooseSchema = {
  Item: new Schema({
    _id: {
      type: Schema.Types.UUID,
      default: () => randomUUID(),
    },
    name: Schema.Types.String,
    done: Schema.Types.Boolean,
  }),
};
