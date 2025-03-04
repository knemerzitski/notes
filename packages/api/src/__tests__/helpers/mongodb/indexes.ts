import { isDefined } from '../../../../../utils/src/type-guards/is-defined';

import {
  collectionSearchIndexDescriptions,
  createAllIndexes,
  dropAllIndexes,
  MongoDBCollections,
} from '../../../mongodb/collections';

import { mongoCollections } from './mongodb';

const TIER = process.env.MONGODB_TIER;
const hasAtlasSearch = TIER === 'enterprise';

interface SearchIndex {
  name: string;
  status: string;
}

export async function dropAndCreateSearchIndexes(
  type: 'only-drop' | 'only-create' | 'drop-and-create' = 'drop-and-create'
) {
  if (type === 'only-drop' || type === 'drop-and-create') {
    await dropSearchIndexes(mongoCollections);
  }

  if (type === 'only-create' || type === 'drop-and-create') {
    await Promise.all([
      createAllIndexes(mongoCollections, {
        indexes: false,
        searchIndexes: hasAtlasSearch,
      }),
      ...(hasAtlasSearch ? [waitForReadySearchIndexes(mongoCollections)] : []),
    ]);
  }
}

async function dropSearchIndexes(collections: MongoDBCollections) {
  await dropAllIndexes(collections, {
    indexes: false,
    searchIndexes: hasAtlasSearch,
  });

  // Check until indexes are dropped
  let haveSearchIndexes = true;
  while (haveSearchIndexes) {
    haveSearchIndexes = await Promise.all(
      Object.entries(collections).map(async ([_colName, collection]) => {
        const indexes = (await collection.listSearchIndexes().toArray()) as SearchIndex[];
        return indexes.length > 0;
      })
    ).then((hasIndexesList) => hasIndexesList.some((hasIndex) => hasIndex));

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function waitForReadySearchIndexes(collections: MongoDBCollections) {
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

  await new Promise((resolve) => setTimeout(resolve, 50));
}
