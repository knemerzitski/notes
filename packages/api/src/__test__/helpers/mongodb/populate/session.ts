import { ObjectId } from 'mongodb';
import {
  sessionDefaultValues,
  SessionSchema,
} from '../../../../mongodb/schema/session/session';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { faker } from '@faker-js/faker';
import { populateQueue } from './populate-queue';
import { mongoCollections } from '../mongodb';

export interface FakeSessionOptions {
  override?: MongoPartialDeep<SessionSchema>;
}

export function fakeSession(options?: FakeSessionOptions): SessionSchema {
  return {
    _id: new ObjectId(),
    cookieId: sessionDefaultValues.cookieId(),
    expireAt: faker.date.soon({ days: 7 }),
    userId: new ObjectId(),
    ...options?.override,
  };
}

export const fakeSessionPopulateQueue: typeof fakeSession = (options) => {
  const user = fakeSession(options);

  populateQueue(async () => {
    await mongoCollections.sessions.insertOne(user);
  });

  return user;
};
