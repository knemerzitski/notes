import { Collection } from 'mongodb';

import { CollectionName } from '../../../mongodb/collection-names';

import { CollectionsStats } from './collection-stats';
import { mongoCollections } from './mongodb';

export const mongoCollectionStats = new CollectionsStats(
  mongoCollections as unknown as Record<CollectionName, Collection>
);
