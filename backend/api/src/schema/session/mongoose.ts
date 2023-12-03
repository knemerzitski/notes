import { randomUUID } from 'crypto';

import { Schema } from 'mongoose';

export const Session = new Schema({
  _id: {
    type: Schema.Types.UUID,
    default: () => randomUUID(),
  },
  userId: {
    type: Schema.Types.UUID,
    required: true,
  },
  expireAt: {
    type: Schema.Types.Date,
    required: true,
    expires: 0,
  },
});

export type SessionSchema = typeof Session;
