import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { SessionSchema } from '../../mongodb/schema/session/session';
import { findByCookieId } from './session';
import { fakeSessionPopulateQueue } from '../../__test__/helpers/mongodb/populate/session';
import { QueryableSessionLoader } from '../../mongodb/loaders/queryable-session-loader';

let session: SessionSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

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
