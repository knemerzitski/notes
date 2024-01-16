import { HydratedDocument, Model, Require_id, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

import { DBUser } from './user';

export interface DBSession {
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
interface DBSessionMethods {}

/**
 * ISession that has userId replaced with an actual user
 */
export type DBSessionWithUser = Require_id<Omit<DBSession, 'userId'>> & {
  user: Require_id<Omit<DBUser, 'notes'>>;
};

export interface SessionModel extends Model<DBSession, object, DBSessionMethods> {
  findByCookieId(cookieId: string): Promise<DBSessionWithUser | undefined>;
}

export type SessionDocument = HydratedDocument<DBSession>;

export const sessionSchema = new Schema<DBSession, SessionModel, DBSessionMethods>({
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
    await this.aggregate<DBSessionWithUser>([
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
          pipeline: [
            {
              $unset: 'notes',
            },
          ],
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
