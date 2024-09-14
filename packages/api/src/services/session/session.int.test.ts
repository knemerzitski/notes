import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { DBSessionSchema } from '../../mongodb/schema/session';
import { fakeSessionPopulateQueue } from '../../__test__/helpers/mongodb/populate/session';
import { QueryableSessionLoader } from '../../mongodb/loaders/session/loader';
import { SessionDuration } from './duration';
import { ObjectId } from 'mongodb';
import {
  findByCookieId,
  insertNewSession,
  tryRefreshExpireAt,
  updateExpireAt,
} from './session';

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();
});

describe('insertNewSession', () => {
  beforeEach(() => {
    mongoCollectionStats.mockClear();
  });

  it('inserts new session', async () => {
    const session = await insertNewSession({
      userId: new ObjectId(),
      collection: mongoCollections.sessions,
      duration: new SessionDuration({
        duration: 10000,
        refreshThreshold: 0.5,
      }),
    });

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

    const dbSession = await mongoCollections.sessions.findOne({
      _id: session._id,
    });

    expect(dbSession).toStrictEqual(session);
  });
});

describe('existing session', () => {
  let session: DBSessionSchema;

  beforeEach(async () => {
    session = fakeSessionPopulateQueue();

    await populateExecuteAll();

    mongoCollectionStats.mockClear();
  });

  describe('findByCookieId', () => {
    it('finds session by cookieId', async () => {
      const loader = new QueryableSessionLoader({
        context: {
          collections: mongoCollections,
        },
      });

      const foundSession = await findByCookieId({
        cookieId: session.cookieId,
        loader,
      });

      expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
      expect(foundSession).toStrictEqual(session);
    });
  });

  describe('updateExpireAt', () => {
    it('updates expireAt with provided value', async () => {
      const newExpireAt = new Date(Date.now() + 10000);

      await updateExpireAt({
        sessionId: session._id,
        expireAt: newExpireAt,
        collection: mongoCollections.sessions,
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
  });
});

describe('tryRefreshExpireAt', () => {
  it('keeps recent session unmodified', async () => {
    const session = fakeSessionPopulateQueue({
      override: {
        expireAt: new Date(Date.now() + 10000),
      },
    });

    await populateExecuteAll();

    mongoCollectionStats.mockClear();

    const refreshedSession = await tryRefreshExpireAt({
      session,
      sessionDuration: new SessionDuration({
        duration: 15,
        refreshThreshold: 0.2, // 3
      }),
      collection: mongoCollections.sessions,
    });

    expect(refreshedSession, 'Recent session was unexpectedly refreshed').toStrictEqual(
      session
    );

    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(0);
  });

  it('refreshes old session and returns new one', async () => {
    const session = fakeSessionPopulateQueue({
      override: {
        expireAt: new Date(Date.now() + 2000),
      },
    });

    await populateExecuteAll();

    mongoCollectionStats.mockClear();

    const duration = new SessionDuration({
      duration: 15,
      refreshThreshold: 0.2, // 3
    });
    const mockedExpireAtTime = Date.now() + 10000;
    vi.spyOn(duration, 'new').mockReturnValueOnce(mockedExpireAtTime);

    const refreshedSession = await tryRefreshExpireAt({
      session,
      sessionDuration: duration,
      collection: mongoCollections.sessions,
    });
    expect(refreshedSession, 'Old session was not refreshed').not.toStrictEqual(session);
    expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

    const dbSession = await mongoCollections.sessions.findOne({
      _id: session._id,
    });

    expect(dbSession).toStrictEqual(
      expect.objectContaining({
        _id: session._id,
        expireAt: new Date(mockedExpireAtTime),
      })
    );
  });
});
