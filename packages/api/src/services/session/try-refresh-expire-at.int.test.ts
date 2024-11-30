import { faker } from '@faker-js/faker';
import { beforeEach, it, expect, vi } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../__tests__/helpers/mongodb/populate/session';
import { SessionDuration } from './duration';
import { tryRefreshExpireAt } from './try-refresh-expire-at';
import { QueryableSessionLoader } from '../../mongodb/loaders/session/loader';

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();
});

it('leaves recent session unmodified', async () => {
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
      duration: 1000 * 15,
      refreshThreshold: 0.2, // 3
    }),
    mongoDB: {
      collections: mongoCollections,
      loaders: {
        session: new QueryableSessionLoader({
          context: {
            collections: mongoCollections,
          },
        }),
      },
    },
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
    duration: 1000 * 15,
    refreshThreshold: 0.2, // 3
  });
  const mockedExpireAtTime = Date.now() + 10000;
  vi.spyOn(duration, 'new').mockReturnValueOnce(mockedExpireAtTime);

  const refreshedSession = await tryRefreshExpireAt({
    session,
    sessionDuration: duration,
    mongoDB: {
      collections: mongoCollections,
      loaders: {
        session: new QueryableSessionLoader({
          context: {
            collections: mongoCollections,
          },
        }),
      },
    },
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
