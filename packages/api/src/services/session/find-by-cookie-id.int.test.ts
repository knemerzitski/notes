import { faker } from '@faker-js/faker';
import { beforeEach, it, expect } from 'vitest';
import {
  resetDatabase,
  mongoCollectionStats,
  mongoCollections,
} from '../../__test__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { DBSessionSchema } from '../../mongodb/schema/session';
import { fakeSessionPopulateQueue } from '../../__test__/helpers/mongodb/populate/session';
import { QueryableSessionLoader } from '../../mongodb/loaders/session/loader';
import { findByCookieId } from './find-by-cookie-id';

let session: DBSessionSchema;

beforeEach(async () => {
  faker.seed(5532);
  await resetDatabase();

  session = fakeSessionPopulateQueue();

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

it('finds session by cookieId', async () => {
  const foundSession = await findByCookieId({
    cookieId: session.cookieId,
    mongoDB: {
      loaders: {
        session: new QueryableSessionLoader({
          context: {
            collections: mongoCollections,
          },
        }),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
  expect(foundSession).toStrictEqual(session);
});
