import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { DBNote } from './note';

/**
 * How user sees a particular note. E.g how it's ordered or is it read-only.
 */
export interface DBUserNote {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  note: {
    id: Types.ObjectId;
    publicId: DBNote['publicId'];
    collabTexts: DBNote['collabTexts'];
  };
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
  note: {
    id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    publicId: {
      type: Schema.Types.String,
      required: true,
    },
    collabTexts: {
      type: Schema.Types.Map,
      required: true,
    },
  },
  readOnly: Schema.Types.Boolean,
  preferences: {
    backgroundColor: Schema.Types.String,
  },
});

userNoteSchema.index(
  { userId: 1, 'note.publicId': 1 },
  {
    unique: true,
  }
);
