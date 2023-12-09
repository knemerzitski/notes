import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export interface INote {
  publicId: string;
  ownerId: Types.ObjectId;
  title?: string;
  textContent?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface INoteMethods {}

export type NoteModel = Model<INote, object, INoteMethods>;
export type NoteDocument = HydratedDocument<INote>;

export const noteSchema = new Schema<INote, NoteModel, INoteMethods>({
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
