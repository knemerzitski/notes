import { MongoClient } from 'mongodb';

import { CollectionName, createCollectionInstances } from '../../../mongodb/collections';

import { createMongoDBLoaders } from '../../../mongodb/loaders';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.MONGODB_URI!;

export async function createMongoDBContext() {
  const mongoClient = new MongoClient(DB_URI, {});
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

export const { mongoClient, mongoDB, mongoCollections, resetDatabase } =
  await createMongoDBContext();

export function createMongoDBApiContext(collections = mongoCollections) {
  return {
    collections,
    loaders: createMongoDBLoaders({
      client: mongoClient,
      collections: mongoCollections,
    }),
  };
}
