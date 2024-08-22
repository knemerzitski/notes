import { describe, beforeEach, it, expect } from 'vitest';
import {
  mongoCollectionStats,
  mongoCollections,
} from '../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../__test__/helpers/mongodb/populate/session';
import { SessionSchema } from '../../mongodb/schema/session/session';
import { deleteAllSessionsInCookies, deleteSessionWithCookies } from './auth';
import { Cookies } from '../http/cookies';
import { ObjectId } from 'mongodb';

describe('existing session', () => {
  let session: SessionSchema;

  beforeEach(async () => {
    session = fakeSessionPopulateQueue();

    await populateExecuteAll();

    mongoCollectionStats.mockClear();
  });

  describe('deleteSessionWithCookies', () => {
    it('deletes session from db and removes cookieId', async () => {
      const cookies = new Cookies();
      const userId = new ObjectId();
      cookies.setSession(userId, session.cookieId);

      await deleteSessionWithCookies({
        userId,
        cookies,
        cookieId: session.cookieId,
        collection: mongoCollections.sessions,
      });

      await expect(
        mongoCollections.sessions.findOne({
          cookieId: session.cookieId,
        })
      ).resolves.toBeNull();

      expect(cookies.getSessionCookeId(userId)).toBeUndefined();
    });
  });

  describe('deleteAllSessionsInCookies', () => {
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
        collection: mongoCollections.sessions,
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
  });
});
