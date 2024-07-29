import mapObject from 'map-obj';
import { Collection, Db, IndexDescription } from 'mongodb';

import { NoteSchema, noteDescription } from './schema/note/note';
import { SessionSchema, sessionDescription } from './schema/session/session';
import {
  ShareNoteLinkSchema,
  shareNoteLinkDescription,
} from './schema/share-note-link/share-note-link';
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
  SHARE_NOTE_LINKS = 'shareNoteLinks',
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  [CollectionName.SESSIONS]: sessionDescription,
  [CollectionName.USERS]: userDescription,
  [CollectionName.USER_NOTES]: userNoteDescription,
  [CollectionName.NOTES]: noteDescription,
  [CollectionName.SHARE_NOTE_LINKS]: shareNoteLinkDescription,
};

export interface MongoDBCollections {
  [CollectionName.SESSIONS]: Collection<SessionSchema>;
  [CollectionName.USERS]: Collection<UserSchema>;
  [CollectionName.USER_NOTES]: Collection<UserNoteSchema>;
  [CollectionName.NOTES]: Collection<NoteSchema>;
  [CollectionName.SHARE_NOTE_LINKS]: Collection<ShareNoteLinkSchema>;
}

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
