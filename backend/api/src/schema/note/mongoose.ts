import { randomUUID } from 'crypto';

import { Schema } from 'mongoose';

export const Note = new Schema({
  _id: {
    type: Schema.Types.UUID,
    default: () => randomUUID(),
  },
  userId: {
    type: Schema.Types.UUID,
    index: true,
    required: true,
  },
  title: {
    type: Schema.Types.String,
    required: false,
  },
  content: {
    type: Schema.Types.String,
    required: false,
  },
});

export type NoteSchema = typeof Note;
