import { faker } from '@faker-js/faker';
import { beforeEach, it, expect } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
 mongoCollectionStats } from '../../../__tests__/helpers/mongodb/instance';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../../__tests__/helpers/mongodb/populate/session';
import { DBSessionSchema } from '../../schema/session';

import { updateExpireAt } from './update-expire-at';

let session: DBSessionSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  session = fakeSessionPopulateQueue();

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

it('updates expireAt with provided value', async () => {
  const newExpireAt = new Date(Date.now() + 10000);

  await updateExpireAt({
    sessionId: session._id,
    expireAt: newExpireAt,
    mongoDB: {
      collections: mongoCollections,
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  const dbSession = await mongoCollections.sessions.findOne({
    _id: session._id,
  });

  expect(dbSession).toStrictEqual(
    expect.objectContaining({
      _id: session._id,
      expireAt: newExpireAt,
    })
  );
});
