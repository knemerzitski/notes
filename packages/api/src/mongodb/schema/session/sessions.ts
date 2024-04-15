import { nanoid } from 'nanoid';

import { ObjectId, WithId } from 'mongodb';
import { CollectionDescription } from '../../collections';

export interface SessionSchema extends WithId<Document> {
  /**
   * ID that is stored in users cookie headers.
   * @default nanoid()
   */
  cookieId: string;
  /**
   * ID of user who this session belongs to.
   */
  userId: ObjectId;
  /**
   * When cookie expires and is deleted from database.
   */
  expireAt: Date;
}

export const defaultValues = {
  cookieId: () => nanoid(),
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
