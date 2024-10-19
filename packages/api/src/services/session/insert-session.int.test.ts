import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeEach, it, expect } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../__tests__/helpers/mongodb/mongodb';
import { SessionDuration } from './duration';
import { insertSession } from './insert-session';
import { QueryableSessionLoader } from '../../mongodb/loaders/session/loader';

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

it('inserts new session', async () => {
  const session = await insertSession({
    userId: new ObjectId(),
    mongoDB: {
      loaders: {
        session: new QueryableSessionLoader({
          context: {
            collections: {
              sessions: mongoCollections.sessions,
            },
          },
        }),
      },
      collections: {
        sessions: mongoCollections.sessions,
      },
    },
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
