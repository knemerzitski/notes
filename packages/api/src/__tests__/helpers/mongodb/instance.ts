import { Collection } from 'mongodb';

import { CollectionName } from '../../../mongodb/collection-names';

import { CollectionsStats } from './collection-stats';
import { createMongoDBContext } from './context';

export const { mongoClient, mongoDB, mongoCollections, resetDatabase } =
  await createMongoDBContext();

export const mongoCollectionStats = new CollectionsStats(
  mongoCollections as unknown as Record<CollectionName, Collection>
);
