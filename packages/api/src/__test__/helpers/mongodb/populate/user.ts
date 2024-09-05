import { faker } from '@faker-js/faker';
import mapObject, { mapObjectSkip } from 'map-obj';
import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';

import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { mongoCollections } from '../mongodb';

import { populateQueue } from './populate-queue';

export interface FakeUserOptions {
  override?: MongoPartialDeep<DBUserSchema>;
}

export function fakeUser(options?: FakeUserOptions): DBUserSchema {
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
