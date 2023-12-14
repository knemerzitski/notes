import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export interface DBNote {
  publicId: string;
  ownerId: Types.ObjectId;
  title?: string;
  textContent?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DBNoteMethods {}

export type NoteModel = Model<DBNote, object, DBNoteMethods>;
export type NoteDocument = HydratedDocument<DBNote>;

export const noteSchema = new Schema<DBNote, NoteModel, DBNoteMethods>({
  publicId: {
    type: Schema.Types.String,
    required: true,
    unique: true,
    default: () => nanoid(),
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: Schema.Types.String,
    required: false,
    trim: true,
  },
  textContent: {
    type: Schema.Types.String,
    required: false,
  },
});
