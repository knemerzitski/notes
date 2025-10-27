import { MongoClient } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { clear } from './clear';
import { seedIfNotExists } from './seed';
import { SEED_DATA } from './seed-data';
import { ConfigModel } from './config-model';
import { withTransaction } from '../mongodb/utils/with-transaction';

// Reset demo once per day
const RESET_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Resets demo data. Existing demo users and notes are deleted.
 */
export async function resetJob(
  enabled: boolean,
  mongoDB: {
    client: MongoClient;
    collections: Pick<
      MongoDBCollections,
      CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
    >;
  }
) {
  if (!enabled) {
    return;
  }

  const configModel = await ConfigModel.create(mongoDB.client.db(), {
    interval: RESET_INTERVAL,
  });

  const now = new Date();
  if (now <= configModel.getNextResetAt()) {
    await withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
      await clear({
        ...mongoDB,
        runSingleOperation,
      });
      await seedIfNotExists(SEED_DATA, {
        ...mongoDB,
        runSingleOperation,
      });

      configModel.refreshNextResetAt();

      await runSingleOperation((session) => configModel.save(session));
    });
  }
}
