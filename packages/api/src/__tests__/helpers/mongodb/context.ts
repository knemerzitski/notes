import { MongoClient } from 'mongodb';

import { CollectionName } from '../../../mongodb/collection-names';
import {
  createCollectionInstances,
  MongoDBCollections,
} from '../../../mongodb/collections';

import { createMongoDBLoaders } from '../../../mongodb/loaders';

export async function createMongoDBContext(options?: { uri?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const uri = options?.uri ?? process.env.MONGODB_URI!;

  const mongoClient = new MongoClient(uri, {});
  await mongoClient.connect();

  const mongoDB = mongoClient.db();

  const mongoCollections = createCollectionInstances(mongoDB);

  function resetDatabase() {
    return Promise.all(
      Object.values(CollectionName).map((name) => mongoCollections[name].deleteMany())
    );
  }

  return {
    mongoClient,
    mongoDB,
    mongoCollections,
    resetDatabase,
  };
}

export function createMongoDBApiContext({
  collections,
  mongoClient,
}: {
  mongoClient: MongoClient;
  collections: MongoDBCollections;
}) {
  return {
    collections,
    loaders: createMongoDBLoaders({
      client: mongoClient,
      collections: collections,
    }),
  };
}
