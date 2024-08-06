import { ObjectId } from 'mongodb';

import isDefined from '~utils/type-guards/isDefined';

import { noteDefaultValues, NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { MongoDeepPartial } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { populateQueue } from './populate-queue';
import { fakeShareNoteLink } from './share-note-link';
import { fakeUserNote } from './user-note';

export interface FakeNoteOptions {
  override?: MongoDeepPartial<Omit<NoteSchema, 'collabTexts'>>;
  collabTexts?: Record<string, FakeCollabTextOptions | undefined>;
}

export function fakeNote(
  ownerUser: Pick<UserSchema, '_id'>,
  options?: FakeNoteOptions
): NoteSchema {
  return {
    _id: new ObjectId(),
    publicId: noteDefaultValues.publicId(),
    ...options?.override,
    userNotes:
      options?.override?.userNotes?.filter(isDefined).map((userNote) => {
        const defaultUserNote = fakeUserNote(ownerUser, {
          override: {
            isOwner: true,
          },
        });

        return {
          ...defaultUserNote,
          ...userNote,
        };
      }) ?? [],
    ...(options?.collabTexts && {
      collabTexts: Object.entries(options.collabTexts).map(([key, value]) => ({
        k: key,
        v: fakeCollabText(ownerUser._id, value),
      })),
    }),
    shareNoteLinks:
      options?.override?.shareNoteLinks?.filter(isDefined).map((shareNoteLink) => ({
        ...fakeShareNoteLink(ownerUser),
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
