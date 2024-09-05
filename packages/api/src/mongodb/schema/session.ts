import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../collections';
import { date, defaulted, Infer, InferRaw, instance, object, string } from 'superstruct';

export const SessionSchema = object({
  _id: instance(ObjectId),
  /**
   * ID that is stored in users cookie headers
   * @default nanoid()
   */
  cookieId: defaulted(string(), () => nanoid(48)),
  /**
   * ID of user who this session belongs to
   */
  userId: instance(ObjectId),
  /**
   * When cookie expires and is deleted from database (expireAfterSeconds index)
   */
  expireAt: date(),
});

export type DBSessionSchema = InferRaw<typeof SessionSchema>;

export type SessionSchema = Infer<typeof SessionSchema>;

export const sessionDescription: CollectionDescription = {
  indexSpecs: [
    {
      key: { cookieId: 1 },
      unique: true,
    },
    {
      key: { expireAt: 1 },
      expireAfterSeconds: 0,
    },
  ],
};
