import { faker } from '@faker-js/faker';
import mapObject, { mapObjectSkip } from 'map-obj';
import { ObjectId } from 'mongodb';

import isDefined from '~utils/type-guards/isDefined';

import { UserSchema } from '../../../../mongodb/schema/user/user';
import { MongoDeepPartial } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { populateQueue } from './populate-queue';

export interface FakeUserOptions {
  override?: MongoDeepPartial<UserSchema>;
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
      category: options?.override?.notes?.category
        ? mapObject(options.override.notes.category, (categoryName, category) => {
            if (!categoryName || !category) return mapObjectSkip;

            const mergedCategory = {
              ...category,
              order: category.order?.filter(isDefined) ?? [],
            };

            return [categoryName, mergedCategory];
          })
        : {},
    },
  };
}

export const fakeUserPopulateQueue: typeof fakeUser = (options) => {
  const user = fakeUser(options);

  populateQueue(async () => {
    await mongoCollections.users.insertOne(user);
  });

  return user;
};
