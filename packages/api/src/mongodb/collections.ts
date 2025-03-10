import mapObject from 'map-obj';
import {
  Collection,
  Db,
  IndexDescription,
  MongoServerError,
  SearchIndexDescription,
} from 'mongodb';

import { retryOnError } from '../../../utils/src/retry-on-error';

import { CollectionName } from './collection-names';
import { collabRecordDescription, DBCollabRecordSchema } from './schema/collab-record';
import {
  noteDescription,
  DBNoteSchema,
  noteSearchIndexDescriptions,
} from './schema/note';
import { DBOpenNoteSchema, openNoteDescription } from './schema/open-note';
import { DBSessionSchema, sessionDescription } from './schema/session';
import { userDescription, DBUserSchema } from './schema/user';

export interface CollectionDescription {
  indexSpecs?: IndexDescription[];
}

export interface DBSchema {
  [CollectionName.SESSIONS]: DBSessionSchema;
  [CollectionName.USERS]: DBUserSchema;
  [CollectionName.NOTES]: DBNoteSchema;
  [CollectionName.COLLAB_RECORDS]: DBCollabRecordSchema;
  [CollectionName.OPEN_NOTES]: DBOpenNoteSchema;
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  sessions: sessionDescription,
  users: userDescription,
  notes: noteDescription,
  collabRecords: collabRecordDescription,
  openNotes: openNoteDescription,
};

export const collectionSearchIndexDescriptions: Partial<
  Record<CollectionName, SearchIndexDescription[]>
> = {
  notes: noteSearchIndexDescriptions,
};

export type MongoDBCollections = {
  [Key in keyof DBSchema]: Collection<DBSchema[Key]>;
};

export type MongoDBCollectionsOnlyNames = {
  [Key in keyof MongoDBCollections]: Pick<MongoDBCollections[Key], 'collectionName'>;
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
          if (!description.indexSpecs || description.indexSpecs.length === 0) {
            return [colName, undefined];
          }

          const indexSpecs = description.indexSpecs;

          const collection = collections[colName];

          return retryOnError(
            async () => {
              const result = await collection.createIndexes(indexSpecs);
              return [colName, result];
            },
            {
              maxAttempts: 10,
              retryDelay: 1000,
              retryErrorCond: (err) =>
                err instanceof MongoServerError && err.codeName === 'NotWritablePrimary',
            }
          );
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

          return retryOnError(
            async () => {
              const result = await collection.createSearchIndexes(searchDescriptions);
              return [colName, result];
            },
            {
              maxAttempts: 10,
              retryDelay: 1000,
              retryErrorCond: (err) =>
                err instanceof MongoServerError &&
                (err.codeName === 'NamespaceNotFound' ||
                  err.codeName == 'NotWritablePrimary' ||
                  err.errmsg == 'Error connecting to Search Index Management service.'),
            }
          );
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
