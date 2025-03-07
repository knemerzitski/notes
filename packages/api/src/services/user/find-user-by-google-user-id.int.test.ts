/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';
import { it, expect, beforeEach } from 'vitest';

import {
  mongoCollections,
  resetDatabase,
 mongoCollectionStats } from '../../__tests__/helpers/mongodb/instance';

import { populateExecuteAll } from '../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../__tests__/helpers/mongodb/populate/user';
import { QueryableUserLoader } from '../../mongodb/loaders/user/loader';
import { DBUserSchema } from '../../mongodb/schema/user';

import { findUserByGoogleUserId } from './find-user-by-google-user-id';

let user: DBUserSchema;

beforeEach(async () => {
  faker.seed(54356);
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

it('finds user by google id', async () => {
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

it('returns null if user not found', async () => {
  const loader = new QueryableUserLoader({
    context: {
      collections: mongoCollections,
    },
  });

  const dbUser = await findUserByGoogleUserId({
    googleUserId: 'random',
    loader,
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  expect(dbUser).toBeNull();
});
