import { MongoClient } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { clear } from './clear';
import { seedIfNotExists } from './seed';
import { SEED_DATA, SeedItem } from './seed-data';

/**
 * Resets demo data. Existing demo users and notes are deleted.
 */
export async function reset(mongoDB: {
  client: MongoClient;
  collections: Pick<
    MongoDBCollections,
    CollectionName.USERS | CollectionName.NOTES | CollectionName.COLLAB_RECORDS
  >;
}) {
  await clear(mongoDB);
  await seedIfNotExists(SEED_DATA, mongoDB);
}
