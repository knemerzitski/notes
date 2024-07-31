import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';

import isDefined from '~utils/type-guards/isDefined';

import { NoteCategory, NoteTextField } from '../../../../graphql/types.generated';
import { noteDefaultValues, NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { populateQueue } from './populate-queue';
import { fakeShareNoteLink } from './share-note-link';
import { fakeUserNote } from './user-note';

export interface FakeNoteOptions {
  override?: DeepPartial<Omit<NoteSchema, 'collabTexts'>>;
  collabTexts?: { [key in NoteTextField]?: FakeCollabTextOptions };
}

export function fakeNote(
  ownerUser: Pick<UserSchema, '_id'>,
  options?: FakeNoteOptions
): NoteSchema {
  return {
    _id: new ObjectId(),
    ownerId: ownerUser._id,
    publicId: noteDefaultValues.publicId(),
    ...options?.override,
    userNotes:
      options?.override?.userNotes
        ?.filter(isDefined)
        .map(({ category, ...restUserNote }) => {
          const defaultUserNote = fakeUserNote(ownerUser);
          return {
            ...defaultUserNote,
            ...restUserNote,
            category: {
              name: NoteCategory.DEFAULT,
              ...defaultUserNote.category,
              ...category,
            },
          };
        }) ?? [],
    collabTexts: mapObject(NoteTextField, (_key, fieldName) => {
      return [
        fieldName,
        fakeCollabText(ownerUser._id, options?.collabTexts?.[fieldName]),
      ];
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
