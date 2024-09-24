import mapObject from 'map-obj';
import { Collection, Db, IndexDescription, SearchIndexDescription } from 'mongodb';

import {
  noteDescription,
  DBNoteSchema,
  noteSearchIndexDescriptions,
} from './schema/note';
import { DBSessionSchema, sessionDescription } from './schema/session';
import { userDescription, DBUserSchema } from './schema/user';
import { DBNoteEditingSchema, noteEditingDescription } from './schema/note-editing';

export interface CollectionDescription {
  indexSpecs?: IndexDescription[];
}

/**
 * Values are actual names of collections in MongoDB Database.
 */
export enum CollectionName {
  SESSIONS = 'sessions',
  USERS = 'users',
  NOTES = 'notes',
  NOTE_EDITING = 'noteEditing',
}

interface CollectionDefinitions {
  [CollectionName.SESSIONS]: {
    schema: Collection<DBSessionSchema>;
  };
  [CollectionName.USERS]: {
    schema: Collection<DBUserSchema>;
  };
  [CollectionName.NOTES]: {
    schema: Collection<DBNoteSchema>;
  };
  [CollectionName.NOTE_EDITING]: {
    schema: Collection<DBNoteEditingSchema>;
  };
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  [CollectionName.SESSIONS]: sessionDescription,
  [CollectionName.USERS]: userDescription,
  [CollectionName.NOTES]: noteDescription,
  [CollectionName.NOTE_EDITING]: noteEditingDescription,
};

export const collectionSearchIndexDescriptions: Partial<
  Record<CollectionName, SearchIndexDescription[]>
> = {
  [CollectionName.NOTES]: noteSearchIndexDescriptions,
};

export type MongoDBCollections = {
  [Key in CollectionName]: CollectionDefinitions[Key]['schema'];
};

export type MongoDBCollectionsOnlyNames = {
  [Key in CollectionName]: Pick<MongoDBCollections[Key], 'collectionName'>;
};

export function createCollectionInstances(mongoDB: Db): MongoDBCollections {
  return mapObject(CollectionName, (_key, name) => {
    return [name, mongoDB.collection(name)];
  }) as MongoDBCollections;
}

interface CreateAllIndexesOptions {
  /**
   * @default true
   */
  indexes?: boolean;
  /**
   * @default false
   */
  searchIndexes?: boolean;
}

export function createAllIndexes(
  collections: MongoDBCollections,
  options?: CreateAllIndexesOptions
) {
  const createIndexes = options?.indexes ?? true;
  const createSearchIndexes = options?.searchIndexes ?? false;

  return Promise.all([
    // CollectionDescription
    ...(createIndexes
      ? Object.entries(collectionDescriptions).map<
          Promise<[CollectionName, string[] | undefined]>
        >(async ([rawKey, description]) => {
          const colName = rawKey as CollectionName;
          if (!description.indexSpecs || description.indexSpecs.length === 0)
            return [colName, undefined];

          const collection = collections[colName];
          const result = await collection.createIndexes(description.indexSpecs);
          return [colName, result];
        })
      : []),

    // SearchIndexDescription
    ...(createSearchIndexes
      ? // createSearchIndex is only available on MongoDB Atlas deployments hosted on at least tier M10
        // M0 requires creating search index through cli or ui
        Object.entries(collectionSearchIndexDescriptions).map<
          Promise<[CollectionName, string[] | undefined]>
        >(async ([rawKey, searchDescriptions]) => {
          const colName = rawKey as CollectionName;

          const collection = collections[colName];
          const result = await collection.createSearchIndexes(searchDescriptions);
          return [colName, result];
        })
      : []),
  ]);
}

interface DropAllIndexesOptions {
  /**
   * @default true
   */
  indexes?: boolean;
  /**
   * @default false
   */
  searchIndexes?: boolean;
}

export function dropAllIndexes(
  collections: MongoDBCollections,
  options?: DropAllIndexesOptions
) {
  const dropIndexes = options?.indexes ?? true;
  const dropSearchIndexes = options?.searchIndexes ?? false;
  return Promise.all([
    // CollectionDescription
    ...(dropIndexes ? Object.values(collections).map((coll) => coll.dropIndexes()) : []),

    // SearchIndexDescription
    ...(dropSearchIndexes
      ? Object.values(collections).flatMap(async (collection) => {
          const existingIndexes = await collection.listSearchIndexes().toArray();

          return existingIndexes.map((index) => collection.dropSearchIndex(index.name));
        })
      : []),
  ]);
}
