import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';

import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { fakeNoteUser, fakeNoteUserTrashed } from './note-user';
import { populateQueue } from './populate-queue';
import { fakeShareNoteLink } from './share-note-link';
import { CollabSchema } from '../../../../mongodb/schema/collab';

export interface FakeNoteOptions {
  override?: MongoPartialDeep<
    Omit<DBNoteSchema, 'collab'> & {
      collab: Omit<CollabSchema, 'texts'>;
    }
  >;
  collabTexts?: Record<string, FakeCollabTextOptions | undefined>;
}

export function fakeNote(
  fallbackUser: Pick<DBUserSchema, '_id'>,
  options?: FakeNoteOptions
): DBNoteSchema {
  return {
    _id: new ObjectId(),
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
    collab: {
      updatedAt: new Date(),
      ...options?.override?.collab,
      texts: options?.collabTexts
        ? Object.entries(options.collabTexts).map(([key, value]) => ({
            k: key,
            v: fakeCollabText(fallbackUser._id, value),
          }))
        : [],
    },
    shareNoteLinks:
      options?.override?.shareNoteLinks?.filter(isDefined).map((shareNoteLink) => ({
        ...fakeShareNoteLink(fallbackUser),
        ...shareNoteLink,
      })) ?? [],
  };
}

export const fakeNotePopulateQueue: typeof fakeNote = (ownerUser, options) => {
  const note = fakeNote(ownerUser, options);

  populateQueue(async () => {
    await mongoCollections.notes.insertOne(note);
  });

  return note;
};
