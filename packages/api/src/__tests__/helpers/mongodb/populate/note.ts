import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';

import { DBCollabRecordSchema } from '../../../../mongodb/schema/collab-record';
import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { fakeNoteUser, fakeNoteUserTrashed } from './note-user';
import { populateQueue } from './populate-queue';
import { fakeShareNoteLink } from './share-note-link';

export interface FakeNoteOptions {
  override?: MongoPartialDeep<Omit<DBNoteSchema, 'collabText'>>;
  collabText?: FakeCollabTextOptions;
}

export function fakeNote(
  fallbackUser: Pick<DBUserSchema, '_id'>,
  options?: FakeNoteOptions
): { note: DBNoteSchema; collabRecords: DBCollabRecordSchema[] } {
  const noteId = options?.override?._id ?? new ObjectId();

  const { collabText, collabRecords } = fakeCollabText(fallbackUser._id, {
    ...options?.collabText,
    mapRecord(record, index) {
      record = {
        ...record,
        override: {
          ...record.override,
          collabTextId: noteId,
        },
      };

      return options?.collabText?.mapRecord?.(record, index) ?? record;
    },
  });

  return {
    note: {
      _id: noteId,
      ...options?.override,
      users:
        options?.override?.users?.filter(isDefined).map((noteUser) => {
          const defaultNoteUser = fakeNoteUser(fallbackUser);

          const { trashed, ...noteUserRest } = noteUser;

          return {
            ...defaultNoteUser,
            ...noteUserRest,
            ...(noteUser.trashed != null && {
              trashed: fakeNoteUserTrashed({
                override: noteUser.trashed,
              }),
            }),
          };
        }) ?? [],
      collabText,
      shareLinks:
        options?.override?.shareLinks?.filter(isDefined).map((shareNoteLink) => ({
          ...fakeShareNoteLink(fallbackUser),
          ...shareNoteLink,
        })) ?? [],
    },
    collabRecords,
  };
}

export const fakeNotePopulateQueue: typeof fakeNote = (ownerUser, options) => {
  const { note, collabRecords } = fakeNote(ownerUser, options);

  populateQueue(async () => {
    await Promise.all([
      mongoCollections.notes.insertOne(note),
      mongoCollections.collabRecords.insertMany(collabRecords),
    ]);
  });

  return { note, collabRecords };
};
