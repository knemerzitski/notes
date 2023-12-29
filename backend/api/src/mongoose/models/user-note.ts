import { HydratedDocument, Model, Schema, Types } from 'mongoose';

/**
 * How user sees a particular note. E.g how it's ordered or is it read-only.
 */
export interface DBUserNote {
  userId: Types.ObjectId;
  notePublicId: string;
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
  notePublicId: {
    type: Schema.Types.String,
    required: true,
  },
  readOnly: Schema.Types.Boolean,
  preferences: {
    backgroundColor: Schema.Types.String,
  },
});

userNoteSchema.index(
  { userId: 1, notePublicId: 1 },
  {
    unique: true,
  }
);
