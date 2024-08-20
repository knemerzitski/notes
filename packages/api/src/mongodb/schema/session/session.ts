import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

import { CollectionDescription } from '../../collections';

export interface SessionSchema {
  _id: ObjectId;
  /**
   * ID that is stored in users cookie headers
   * @default nanoid()
   */
  cookieId: string;
  /**
   * ID of user who this session belongs to
   */
  userId: ObjectId;
  /**
   * When cookie expires and is deleted from database (expireAfterSeconds index)
   */
  expireAt: Date;
}

export const sessionDefaultValues = {
  cookieId: () => nanoid(48),
};

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
