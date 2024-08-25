/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  updateDisplayName,
  primeDisplayName,
  findUserByGoogleUserId,
  insertNewUserWithGoogleUser,
} from './user';
import { UserSchema } from '../../mongodb/schema/user';
import { fakeUserPopulateQueue } from '../../__test__/helpers/mongodb/populate/user';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../__test__/helpers/mongodb/mongodb';
import { faker } from '@faker-js/faker';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { ObjectId } from 'mongodb';

let user: UserSchema;

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

describe('primeDisplayName', () => {
  it('primes user with provided displayName', async () => {
    const loader = new QueryableUserLoader({
      context: {
        collections: mongoCollections,
      },
    });
    const userId = new ObjectId();

    primeDisplayName({
      userId,
      displayName: 'new name',
      loader,
    });

    await expect(
      loader.load({
        id: {
          userId,
        },
        query: {
          profile: {
            displayName: 1,
          },
        },
      })
    ).resolves.toStrictEqual({
      _id: userId,
      profile: {
        displayName: 'new name',
      },
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(0);
  });
});

describe('findUserByGoogleUserId', () => {
  it('finds user by google id and only returns id', async () => {
    const loader = new QueryableUserLoader({
      context: {
        collections: mongoCollections,
      },
    });

    const dbUser = await findUserByGoogleUserId({
      googleUserId: user.thirdParty!.google!.id!,
      loader,
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

    expect(dbUser).toStrictEqual({
      _id: user._id,
      thirdParty: {
        google: {
          id: user.thirdParty?.google?.id,
        },
      },
    });
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
