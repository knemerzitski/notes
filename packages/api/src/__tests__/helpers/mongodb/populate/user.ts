import { faker } from '@faker-js/faker';
import mapObject, { mapObjectSkip } from 'map-obj';
import { ObjectId } from 'mongodb';

import { isDefined } from '../../../../../../utils/src/type-guards/is-defined';

import { DBUserSchema } from '../../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../../mongodb/types';
import { mongoCollections } from '../instance';

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
    note: {
      ...options?.override?.note,
      categories: options?.override?.note?.categories
        ? mapObject(options.override.note.categories, (categoryName, category) => {
            if (!categoryName || !category) return mapObjectSkip;

            const mergedCategory = {
              ...category,
              noteIds: category.noteIds?.filter(isDefined) ?? [],
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
