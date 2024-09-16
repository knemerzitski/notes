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
import { deleteAllSessionsInCookies } from './delete-all-sessions-in-cookies';

let session: DBSessionSchema;

beforeEach(async () => {
  session = fakeSessionPopulateQueue();

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

it('deletes all sessions in cookies and clears it', async () => {
  const session2 = fakeSessionPopulateQueue();
  await populateExecuteAll();

  const cookies = new Cookies();
  const userId = new ObjectId();
  const userId2 = new ObjectId();
  cookies.setSession(userId, session.cookieId);
  cookies.setSession(userId2, session2.cookieId);

  await deleteAllSessionsInCookies({
    cookies,
    mongoDB: {
      collections: mongoCollections,
    },
  });

  await expect(
    mongoCollections.sessions
      .find({
        cookieId: {
          $in: cookies.getAvailableSessionCookieIds(),
        },
      })
      .toArray()
  ).resolves.toHaveLength(0);

  expect(cookies.getAvailableSessionUserIds()).toHaveLength(0);
});
