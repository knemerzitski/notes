import { faker } from '@faker-js/faker';

import { ObjectId } from 'mongodb';

import { DBShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';

export interface FakeShareNoteLinkOptions {
  override?: MongoPartialDeep<DBShareNoteLinkSchema>;
}

export function fakeShareNoteLink(
  author: Pick<DBUserSchema, '_id'>,
  options?: FakeShareNoteLinkOptions
): DBShareNoteLinkSchema {
  return {
    _id: new ObjectId(),
    expireAccessCount: faker.number.int({ min: 2, max: 20 }),
    expireAt: faker.date.future({
      years: 1,
    }),
    authorId: author._id,
    ...options?.override,
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
