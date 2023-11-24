import { randomUUID } from 'crypto';

import { Schema } from 'mongoose';

export const User = new Schema({
  _id: {
    type: Schema.Types.UUID,
    default: () => randomUUID(),
  },
  thirdParty: {
    google: {
      id: {
        type: Schema.Types.String,
        index: true,
      },
    },
  },
});

export type UserSchema = typeof User;
