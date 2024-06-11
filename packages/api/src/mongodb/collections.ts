import { Collection, Db, IndexDescription } from 'mongodb';
import { UserSchema, userDescription } from './schema/user';
import mapObject from 'map-obj';
import { SessionSchema, sessionDescription } from './schema/session/sessions';
import { UserNoteSchema, userNoteDescription } from './schema/user-note';
import { NoteSchema, noteDescription } from './schema/note';
import { CollabTextSchema, collabTextDescription } from './schema/collab-text';
import { ShareNoteLinkSchema, shareNoteLinkDescription } from './schema/share-note-link';

export interface CollectionDescription {
  indexSpecs?: IndexDescription[];
}

/**
 * Values are actual names of collections in MongoDB Database.
 */
export enum CollectionName {
  Sessions = 'sessions',
  Users = 'users',
  UserNotes = 'usernotes',
  Notes = 'notes',
  CollabTexts = 'collabtexts',
  ShareNoteLinks = 'sharenotelinks',
}

export const collectionDescriptions: Partial<
  Record<CollectionName, CollectionDescription>
> = {
  [CollectionName.Sessions]: sessionDescription,
  [CollectionName.Users]: userDescription,
  [CollectionName.UserNotes]: userNoteDescription,
  [CollectionName.Notes]: noteDescription,
  [CollectionName.CollabTexts]: collabTextDescription,
  [CollectionName.ShareNoteLinks]: shareNoteLinkDescription,
};

export interface MongoDBCollections {
  [CollectionName.Sessions]: Collection<SessionSchema>;
  [CollectionName.Users]: Collection<UserSchema>;
  [CollectionName.UserNotes]: Collection<UserNoteSchema>;
  [CollectionName.Notes]: Collection<NoteSchema>;
  [CollectionName.CollabTexts]: Collection<CollabTextSchema>;
  [CollectionName.ShareNoteLinks]: Collection<ShareNoteLinkSchema>;
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
