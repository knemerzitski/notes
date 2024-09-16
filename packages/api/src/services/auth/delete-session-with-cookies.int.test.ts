import { beforeEach, it, expect } from 'vitest';
import {
  mongoCollectionStats,
  mongoCollections,
} from '../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../__test__/helpers/mongodb/populate/session';
import { DBSessionSchema } from '../../mongodb/schema/session';
import { Cookies } from '../http/cookies';
import { ObjectId } from 'mongodb';
import { deleteSessionWithCookies } from './delete-session-with-cookies';

let session: DBSessionSchema;

beforeEach(async () => {
  session = fakeSessionPopulateQueue();

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

it('deletes session from db and removes cookieId', async () => {
  const cookies = new Cookies();
  const userId = new ObjectId();
  cookies.setSession(userId, session.cookieId);

  await deleteSessionWithCookies({
    userId,
    cookies,
    cookieId: session.cookieId,
    mongoDB: {
      collections: mongoCollections,
    },
  });

  await expect(
    mongoCollections.sessions.findOne({
      cookieId: session.cookieId,
    })
  ).resolves.toBeNull();

  expect(cookies.getSessionCookeId(userId)).toBeUndefined();
});
