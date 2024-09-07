/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, it } from 'vitest';
import { updateDisplayName, insertNewUserWithGoogleUser } from './user';
import { DBUserSchema } from '../../mongodb/schema/user';
import { fakeUserPopulateQueue } from '../../__test__/helpers/mongodb/populate/user';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../__test__/helpers/mongodb/mongodb';
import { faker } from '@faker-js/faker';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';

let user: DBUserSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  user = fakeUserPopulateQueue({
    override: {
      profile: {
        displayName: 'initial',
      },
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

describe('updateDisplayName', () => {
  it('updates user displayName', async () => {
    await updateDisplayName({
      userId: user._id,
      displayName: 'new name',
      collection: mongoCollections.users,
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
});

describe('insertNewUserWithGoogleUser', () => {
  it('inserts new user with displayName', async () => {
    const newUser = await insertNewUserWithGoogleUser({
      id: '1234',
      displayName: 'aaa',
      collection: mongoCollections.users,
    });
    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

    const dbUser = await mongoCollections.users.findOne({
      _id: newUser._id,
    });

    expect(dbUser).toStrictEqual(newUser);
  });
});
