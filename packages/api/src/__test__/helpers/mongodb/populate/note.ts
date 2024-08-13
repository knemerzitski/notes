import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';

import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { MongoDeepPartial } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { fakeNoteUser, fakeNoteUserTrashed } from './note-user';
import { populateQueue } from './populate-queue';
import { fakeShareNoteLink } from './share-note-link';

export interface FakeNoteOptions {
  override?: MongoDeepPartial<Omit<NoteSchema, 'collabTexts'>>;
  collabTexts?: Record<string, FakeCollabTextOptions | undefined>;
}

export function fakeNote(
  fallbackUser: Pick<UserSchema, '_id'>,
  options?: FakeNoteOptions
): NoteSchema {
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
    ...(options?.collabTexts && {
      collabTexts: Object.entries(options.collabTexts).map(([key, value]) => ({
        k: key,
        v: fakeCollabText(fallbackUser._id, value),
      })),
    }),
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
