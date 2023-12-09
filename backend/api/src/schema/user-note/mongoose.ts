import { HydratedDocument, Model, Schema, Types } from 'mongoose';

/**
 * How user sees a particular note. E.g how it's ordered or is it read-only.
 */
export interface IUserNote {
  userId: Types.ObjectId;
  noteId: Types.ObjectId;
  list: {
    /**
     * Note order in a list. Displayed for user in ascending order.
     */
    order: string;
  };
  /**
   * @default false
   */
  readOnly?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IUserNoteMethods {}

export type UserNoteModel = Model<IUserNote, object, IUserNoteMethods>;
export type UserNoteDocument = HydratedDocument<IUserNote>;

export const userNoteSchema = new Schema<IUserNote, UserNoteModel, IUserNoteMethods>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  noteId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  list: {
    order: {
      type: Schema.Types.String,
      required: true,
    },
  },
  readOnly: Schema.Types.Boolean,
});

userNoteSchema.index(
  { userId: 1, noteId: 1, 'list.order': 1 },
  {
    unique: true,
  }
);
