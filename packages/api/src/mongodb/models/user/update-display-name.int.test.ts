import { faker } from '@faker-js/faker';
import { beforeEach, it, expect } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../__test__/helpers/mongodb/populate/user';
import { DBUserSchema } from '../../schema/user';
import { updateDisplayName } from './update-display-name';

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
