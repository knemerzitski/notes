import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

import { CollectionName } from '../../../../mongodb/collections';
import {
  shareNoteLinkDefaultValues,
  ShareNoteLinkSchema,
} from '../../../../mongodb/schema/share-note-link';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
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
      ...userNote.note,
      ...options?.override?.note,
    },
    sourceUserNote: {
      id: userNote._id,
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
    await mongoCollections[CollectionName.SHARE_NOTE_LINKS].insertOne(shareNoteLink);
  });

  return shareNoteLink;
};
