import { MongoClient } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { SEED_DATA } from './seed-data';
import { seedIfNotExists } from './seed';
import { withTransaction } from '../mongodb/utils/with-transaction';
import { clear } from './clear';

/**
 * Insert demo seed users and notes to database only if missing. Nothing is changed if data is already in database.
 *
 * If not enabled then demo data is cleared
 */
export async function initializeJob(
  enabled: boolean,
  mongoDB: {
    client: MongoClient;
    collections: Pick<
      MongoDBCollections,
      CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
    >;
  }
) {
  if (enabled) {
    await withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
      await seedIfNotExists(SEED_DATA, { ...mongoDB, runSingleOperation });
    });
  } else {
    await withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
      await clear({
        ...mongoDB,
        runSingleOperation,
      });
    });
  }
}
