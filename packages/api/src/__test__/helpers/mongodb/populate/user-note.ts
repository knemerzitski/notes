import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

import { NoteCategory } from '../../../../graphql/types.generated';
import { CollectionName } from '../../../../mongodb/collections';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';
import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { populateQueue } from './populate-queue';

export interface FakeUserNoteOptions {
  override?: DeepPartial<UserNoteSchema>;
}

export function fakeUserNote(
  user: Pick<UserSchema, '_id'>,
  note: Pick<NoteSchema, '_id' | 'publicId'>,
  options?: FakeUserNoteOptions
): UserNoteSchema {
  return {
    _id: new ObjectId(),
    userId: user._id,
    readOnly: !!faker.number.int({ max: 1 }),
    ...options?.override,
    note: {
      _id: note._id,
      publicId: note.publicId,
      ...options?.override?.note,
    },
    preferences: {
      backgroundColor: faker.color.rgb(),
      ...options?.override?.preferences,
    },
    category: {
      name: NoteCategory.DEFAULT,
      ...options?.override?.category,
    },
  };
}

export const fakeUserNotePopulateQueue: typeof fakeUserNote = (user, note, options) => {
  const userNote = fakeUserNote(user, note, options);

  populateQueue(async () => {
    await mongoCollections[CollectionName.USER_NOTES].insertOne(userNote);
  });

  return userNote;
};
