import { Collection } from 'mongodb';

import { CollectionName } from '../../../mongodb/collection-names';

import { createMongoDBLoaders } from '../../../mongodb/loaders';

import { CollectionsStats } from './collection-stats';
import { createMongoDBContext } from './context';

export const { mongoClient, mongoDB, mongoCollections, resetDatabase } =
  await createMongoDBContext();

export const mongoCollectionStats = new CollectionsStats(
  mongoCollections as unknown as Record<CollectionName, Collection>
);

export function createMongoDBApiInstanceContext(collections = mongoCollections) {
  return {
    collections,
    loaders: createMongoDBLoaders({
      client: mongoClient,
      collections: mongoCollections,
    }),
  };
}
