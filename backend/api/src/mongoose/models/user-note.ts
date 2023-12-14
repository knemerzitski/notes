import { HydratedDocument, Model, Schema, Types } from 'mongoose';

/**
 * How user sees a particular note. E.g how it's ordered or is it read-only.
 */
export interface DBUserNote {
  userId: Types.ObjectId;
  noteId: Types.ObjectId;
  /**
   * @default false
   */
  readOnly?: boolean;
  preferences?: {
    backgroundColor?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DBUserNoteMethods {}

export type UserNoteModel = Model<DBUserNote, object, DBUserNoteMethods>;
export type UserNoteDocument = HydratedDocument<DBUserNote>;

export const userNoteSchema = new Schema<DBUserNote, UserNoteModel, DBUserNoteMethods>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  noteId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  readOnly: Schema.Types.Boolean,
  preferences: {
    backgroundColor: Schema.Types.String,
  },
});

userNoteSchema.index(
  { userId: 1, noteId: 1 },
  {
    unique: true,
  }
);
