import isDefined from '~utils/type-guards/isDefined';

import {
  collectionSearchIndexDescriptions,
  createAllIndexes,
  dropAllIndexes,
  MongoDBCollections,
} from '../../../mongodb/collections';

import { mongoCollections } from './mongodb';

const TIER = process.env.TEST_MONGODB_TIER;
const hasAtlasSearch = TIER === 'enterprise';

export async function dropAndCreateSearchIndexes() {
  await dropAllIndexes(mongoCollections, {
    indexes: false,
    searchIndexes: hasAtlasSearch,
  });

  await Promise.all([
    createAllIndexes(mongoCollections, {
      indexes: false,
      searchIndexes: hasAtlasSearch,
    }),
    ...(hasAtlasSearch ? [waitForReadySearchIndexes(mongoCollections)] : []),
  ]);
}

interface SearchIndex {
  name: string;
  status: string;
}

export async function waitForReadySearchIndexes(collections: MongoDBCollections) {
  const notReadyIndexes = new Set(
    Object.entries(collectionSearchIndexDescriptions).flatMap(([colName, descs]) =>
      descs
        .map((desc) => {
          if (!desc.name) return;
          return `${colName}:${desc.name}`;
        })
        .filter(isDefined)
    )
  );

  while (notReadyIndexes.size > 0) {
    await Promise.all(
      Object.entries(collections).map(async ([colName, collection]) => {
        const indexes = (await collection.listSearchIndexes().toArray()) as SearchIndex[];
        for (const index of indexes) {
          const key = `${colName}:${index.name}`;
          if (index.status === 'READY') {
            notReadyIndexes.delete(key);
          }
        }
        return;
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
