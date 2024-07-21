import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';

import isDefined from '~utils/type-guards/isDefined';

import { NoteCategory } from '../../../../graphql/types.generated';
import { CollectionName } from '../../../../mongodb/collections';
import { UserSchema } from '../../../../mongodb/schema/user';

import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { populateQueue } from './populate-queue';

export interface FakeUserOptions {
  override?: DeepPartial<UserSchema>;
}

export function fakeUser(options?: FakeUserOptions): UserSchema {
  return {
    _id: new ObjectId(),
    ...options?.override,
    profile: {
      displayName: faker.person.fullName(),
      ...options?.override?.profile,
    },
    thirdParty: {
      ...options?.override?.thirdParty,
      google: {
        id: faker.string.numeric({ length: 20 }),
        ...options?.override?.thirdParty?.google,
      },
    },
    notes: {
      ...options?.override?.notes,
      category: mapObject(NoteCategory, (_key, categoryName) => [
        categoryName,
        {
          ...options?.override?.notes?.category?.[categoryName],
          order:
            options?.override?.notes?.category?.[categoryName]?.order?.filter(
              isDefined
            ) ?? [],
        },
      ]),
    },
  };
}

export const fakeUserPopulateQueue: typeof fakeUser = (options) => {
  const user = fakeUser(options);

  populateQueue(async () => {
    await mongoCollections[CollectionName.USERS].insertOne(user);
  });

  return user;
};
