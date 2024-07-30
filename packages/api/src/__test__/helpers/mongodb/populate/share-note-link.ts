import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

import {
  shareNoteLinkDefaultValues,
  ShareNoteLinkSchema,
} from '../../../../mongodb/schema/share-note-link/share-note-link';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';
import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { populateQueue } from './populate-queue';

export interface FakeShareNoteLinkOptions {
  override?: DeepPartial<ShareNoteLinkSchema>;
}

export function fakeShareNoteLink(
  userNote: Pick<UserNoteSchema, '_id' | 'note'>,
  options?: FakeShareNoteLinkOptions
): ShareNoteLinkSchema {
  return {
    _id: new ObjectId(),
    publicId: shareNoteLinkDefaultValues.publicId(),
    expireAccessCount: faker.number.int({ min: 2, max: 20 }),
    expireAt: faker.date.future({
      years: 1,
    }),
    ...options?.override,
    note: {
      _id: userNote.note._id,
      publicId: userNote.note.publicId,
      ...options?.override?.note,
    },
    sourceUserNote: {
      _id: userNote._id,
      ...options?.override?.sourceUserNote,
    },
    permissions: {
      ...options?.override?.permissions,
      user: {
        readOnly: !!faker.number.int({ max: 1 }),
        ...options?.override?.permissions?.user,
      },
      guest: {
        readOnly: !!faker.number.int({ max: 1 }),
        ...options?.override?.permissions?.guest,
      },
    },
  };
}

export const fakeShareNoteLinkPopulateQueue: typeof fakeShareNoteLink = (
  userNote,
  options
) => {
  const shareNoteLink = fakeShareNoteLink(userNote, options);

  populateQueue(async () => {
    await mongoCollections.shareNoteLinks.insertOne(shareNoteLink);
  });

  return shareNoteLink;
};
