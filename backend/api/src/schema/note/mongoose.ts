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
    required: true,
  },
  content: {
    type: Schema.Types.String,
    required: true,
  },
});

export type NoteSchema = typeof Note;
