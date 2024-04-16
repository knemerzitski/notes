import { Collection } from 'mongodb';
import { UserSchema } from '../../user';
import { SessionSchema } from '../sessions';

/**
 * ISession that has userId replaced with an actual user
 */
export type SessionsLookupUser = Omit<SessionSchema, 'userId'> & {
  user: Omit<UserSchema, 'notes'>;
};

interface FindByCookieIdInput {
  cookieId: string;
  sessionsCollection: Collection<SessionSchema>;
  usersCollectionName: string;
}

/**
 * Finds session by cookieId and looks up user of the session.
 */
export default async function findByCookieId({
  cookieId,
  sessionsCollection,
  usersCollectionName,
}: FindByCookieIdInput): Promise<SessionsLookupUser | undefined> {
  return (
    await sessionsCollection
      .aggregate<SessionsLookupUser>([
        {
          $match: {
            cookieId,
          },
        },
        {
          $lookup: {
            from: usersCollectionName,
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
      .toArray()
  )[0];
}
