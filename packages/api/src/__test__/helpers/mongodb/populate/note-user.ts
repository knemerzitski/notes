import { faker } from '@faker-js/faker';

import { NoteUserSchema } from '../../../../mongodb/schema/note-user';
import { DBUserSchema } from '../../../../mongodb/schema/user';

import { MongoPartialDeep } from '../../../../mongodb/types';

import { TestNoteCategory } from './populate';

export interface FakeNoteUserOptions {
  override?: MongoPartialDeep<NoteUserSchema>;
  /**
   * @default false
   */
  trashed?: boolean;
}

let createCounter = 0;

export function fakeNoteUser(
  user: Pick<DBUserSchema, '_id'>,
  options?: FakeNoteUserOptions
): NoteUserSchema {
  const { trashed: trashedOverride, ...override } = options?.override ?? {};

  return {
    _id: user._id,
    readOnly: !!faker.number.int({ max: 1 }),
    categoryName: TestNoteCategory.MAIN,
    isOwner: true,
    createdAt: new Date(Date.now() + createCounter++),
    ...override,
    preferences: {
      backgroundColor: faker.color.rgb(),
      ...override.preferences,
    },
    ...((!!options?.trashed || trashedOverride != null) && {
      trashed: fakeNoteUserTrashed({
        override: trashedOverride,
      }),
    }),
  };
}

export interface FakeNoteUserTrashedOptions {
  override?: MongoPartialDeep<NoteUserSchema['trashed']>;
}

export function fakeNoteUserTrashed(options?: FakeNoteUserTrashedOptions) {
  return {
    expireAt: faker.date.soon({ days: 3 }),
    originalCategoryName: TestNoteCategory.MAIN,
    ...options?.override,
  };
}
