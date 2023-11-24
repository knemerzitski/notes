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
  // TODO add ttl?, and update if hasnt updated since...
  // Otherwise session will never be deleted
  // After every query, update ttl
});

export type SessionSchema = typeof Session;
