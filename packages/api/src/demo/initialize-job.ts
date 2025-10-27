import { MongoClient } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { SEED_DATA } from './seed-data';
import { seedIfNotExists } from './seed';
import { withTransaction } from '../mongodb/utils/with-transaction';

/**
 * Insert demo seed users and notes to database only if missing. Nothing is changed if data is already in database.
 */
export async function initializeJob(mongoDB: {
  client: MongoClient;
  collections: Pick<MongoDBCollections, CollectionName.USERS | CollectionName.NOTES>;
}) {
  await withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
    await seedIfNotExists(SEED_DATA, { ...mongoDB, runSingleOperation });
  });
}
