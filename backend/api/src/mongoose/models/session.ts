import { HydratedDocument, Model, Require_id, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

import { IUser } from './user';

export interface ISession {
  /**
   * ID that can be stored in a users brower cookie headers.
   * @default nanoid()
   */
  cookieId: string;
  /**
   * ID of user who this session belongs to.
   */
  userId: Types.ObjectId;
  /**
   * When cookie expires and is deleted from database.
   */
  expireAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ISessionMethods {}

/**
 * ISession that has userId replaced with an actual user
 */
export type ISessionWithUser = Require_id<Omit<ISession, 'userId'>> & {
  user: Require_id<IUser>;
};

export interface SessionModel extends Model<ISession, object, ISessionMethods> {
  findByCookieId(cookieId: string): Promise<ISessionWithUser | undefined>;
}

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

sessionSchema.static('findByCookieId', async function findByCookieId(cookieId: string) {
  return (
    await this.aggregate<ISessionWithUser>([
      {
        $match: {
          cookieId,
        },
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'userId',
          as: 'user',
        },
      },
      { $unset: 'userId' },
      {
        $set: {
          user: { $arrayElemAt: ['$user', 0] },
        },
      },
    ])
  )[0];
});
