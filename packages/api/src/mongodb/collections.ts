import mapObject from 'map-obj';
import { Collection, Db, IndexDescription } from 'mongodb';

import { NoteSchema, noteDescription } from './schema/note/note';
import { SessionSchema, sessionDescription } from './schema/session/session';
import { userDescription, UserSchema } from './schema/user/user';
import { UserNoteSchema, userNoteDescription } from './schema/user-note/user-note';

export interface CollectionDescription {
  indexSpecs?: IndexDescription[];
}

/**
 * Values are actual names of collections in MongoDB Database.
 */
export enum CollectionName {
  SESSIONS = 'sessions',
  USERS = 'users',
  USER_NOTES = 'userNotes',
  NOTES = 'notes',
}

interface CollectionDefinitions {
  [CollectionName.SESSIONS]: {
    schema: Collection<SessionSchema>;
  };
  [CollectionName.USERS]: {
    schema: Collection<UserSchema>;
  };
  [CollectionName.USER_NOTES]: {
    schema: Collection<UserNoteSchema>;
  };
  [CollectionName.NOTES]: {
    schema: Collection<NoteSchema>;
  };
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  [CollectionName.SESSIONS]: sessionDescription,
  [CollectionName.USERS]: userDescription,
  [CollectionName.USER_NOTES]: userNoteDescription,
  [CollectionName.NOTES]: noteDescription,
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

export async function createAllIndexes(
  collections: MongoDBCollections
): Promise<Record<CollectionName, string[] | undefined>> {
  const results = await Promise.all(
    Object.entries(collectionDescriptions).map<
      Promise<[CollectionName, string[] | undefined]>
    >(async ([rawKey, schema]) => {
      const key = rawKey as CollectionName;
      if (!schema.indexSpecs || schema.indexSpecs.length === 0) return [key, undefined];

      const collection = collections[key];
      const result = await collection.createIndexes(schema.indexSpecs);
      return [key, result];
    })
  );

  return Object.fromEntries(results) as Record<CollectionName, string[] | undefined>;
}
