import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, it, expect } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
  mongoCollectionStats,
} from '../../../__tests__/helpers/mongodb/instance';
import { DBUserSchema, UserSchema } from '../../schema/user';

import { updateDisplayName } from './update-display-name';

let user: DBUserSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  user = UserSchema.create({
    _id: new ObjectId(),
    profile: {
      displayName: 'initial name',
    },
  });

  await mongoCollections.users.insertOne(user);

  mongoCollectionStats.mockClear();
});

it('updates user displayName', async () => {
  await updateDisplayName({
    userId: user._id,
    displayName: 'new name',
    mongoDB: {
      collections: mongoCollections,
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  const dbUser = await mongoCollections.users.findOne({
    _id: user._id,
  });
  expect(dbUser).toStrictEqual(
    expect.objectContaining({
      profile: {
        displayName: 'new name',
      },
    })
  );
});
