import { ObjectId } from 'mongodb';
import { DBSessionSchema, SessionSchema } from '../../../../mongodb/schema/session';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { faker } from '@faker-js/faker';
import { populateQueue } from './populate-queue';
import { mongoCollections } from '../mongodb';

export interface FakeSessionOptions {
  override?: MongoPartialDeep<DBSessionSchema>;
}

export function fakeSession(options?: FakeSessionOptions): DBSessionSchema {
  return SessionSchema.createRaw({
    _id: new ObjectId(),
    expireAt: faker.date.soon({ days: 7 }),
    userId: new ObjectId(),
    ...options?.override,
  });
}

export const fakeSessionPopulateQueue: typeof fakeSession = (options) => {
  const session = fakeSession(options);

  populateQueue(async () => {
    await mongoCollections.sessions.insertOne(session);
  });

  return session;
};
