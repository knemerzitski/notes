import { faker } from '@faker-js/faker';
import { beforeEach, expect, it } from 'vitest';

import {
  mongoCollections,
  resetDatabase,
  mongoCollectionStats,
  createMongoDBApiInstanceContext,
} from '../../__tests__/helpers/mongodb/instance';

import { insertUserWithGoogleUser } from './insert-user-with-google-user';

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  mongoCollectionStats.mockClear();
});

it('inserts new user with displayName', async () => {
  const newUser = await insertUserWithGoogleUser({
    id: '1234',
    displayName: 'aaa',
    mongoDB: createMongoDBApiInstanceContext(),
  });
  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  const dbUser = await mongoCollections.users.findOne({
    _id: newUser._id,
  });

  expect(dbUser).toStrictEqual(newUser);
});
