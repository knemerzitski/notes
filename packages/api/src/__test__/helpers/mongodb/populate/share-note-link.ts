import { faker } from '@faker-js/faker';

import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { ObjectId } from 'mongodb';

export interface FakeShareNoteLinkOptions {
  override?: MongoPartialDeep<ShareNoteLinkSchema>;
}

export function fakeShareNoteLink(
  creatorUser: Pick<DBUserSchema, '_id'>,
  options?: FakeShareNoteLinkOptions
): ShareNoteLinkSchema {
  return {
    _id: new ObjectId(),
    expireAccessCount: faker.number.int({ min: 2, max: 20 }),
    expireAt: faker.date.future({
      years: 1,
    }),
    creatorUserId: creatorUser._id,
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
