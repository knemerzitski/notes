import { faker } from '@faker-js/faker';

import { NoteUserSchema } from '../../../../mongodb/schema/note/note-user';
import { UserSchema } from '../../../../mongodb/schema/user/user';

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
  user: Pick<UserSchema, '_id'>,
  options?: FakeNoteUserOptions
): NoteUserSchema {
  const { trashed: trashedOverride, ...override } = options?.override ?? {};

  return {
    _id: user._id,
    readOnly: !!faker.number.int({ max: 1 }),
    categoryName: TestNoteCategory.MAIN,
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
