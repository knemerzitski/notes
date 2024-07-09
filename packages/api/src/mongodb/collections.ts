import mapObject from 'map-obj';
import { Collection, Db, IndexDescription } from 'mongodb';

import { CollabTextSchema, collabTextDescription } from './schema/collab-text';
import { NoteSchema, noteDescription } from './schema/note';
import { SessionSchema, sessionDescription } from './schema/session/sessions';
import { ShareNoteLinkSchema, shareNoteLinkDescription } from './schema/share-note-link';
import { UserSchema, userDescription } from './schema/user';
import { UserNoteSchema, userNoteDescription } from './schema/user-note';

export interface CollectionDescription {
  indexSpecs?: IndexDescription[];
}

/**
 * Values are actual names of collections in MongoDB Database.
 */
export enum CollectionName {
  SESSIONS = 'sessions',
  USERS = 'users',
  USER_NOTES = 'usernotes',
  NOTES = 'notes',
  COLLAB_TEXTS = 'collabtexts',
  SHARE_NOTE_LINKS = 'sharenotelinks',
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  [CollectionName.SESSIONS]: sessionDescription,
  [CollectionName.USERS]: userDescription,
  [CollectionName.USER_NOTES]: userNoteDescription,
  [CollectionName.NOTES]: noteDescription,
  [CollectionName.COLLAB_TEXTS]: collabTextDescription,
  [CollectionName.SHARE_NOTE_LINKS]: shareNoteLinkDescription,
};

export interface MongoDBCollections {
  [CollectionName.SESSIONS]: Collection<SessionSchema>;
  [CollectionName.USERS]: Collection<UserSchema>;
  [CollectionName.USER_NOTES]: Collection<UserNoteSchema>;
  [CollectionName.NOTES]: Collection<NoteSchema>;
  [CollectionName.COLLAB_TEXTS]: Collection<CollabTextSchema>;
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
