import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export interface ISession {
  /**
   * ID that can be stored in a users brower cookie headers.
   * @default nanoid()
   */
  cookieId: string;
  /**
   * User who this session belongs to.
   */
  userId: Types.ObjectId;
  /**
   * When cookie expires and is deleted from database.
   */
  expireAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ISessionMethods {}

export type SessionModel = Model<ISession, object, ISessionMethods>;
export type SessionDocument = HydratedDocument<ISession>;

export const sessionSchema = new Schema<ISession, SessionModel, ISessionMethods>({
  cookieId: {
    type: Schema.Types.String,
    required: true,
    unique: true,
    default: () => nanoid(),
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  expireAt: {
    type: Schema.Types.Date,
    required: true,
    expires: 0,
  },
});
