import { faker } from '@faker-js/faker';

import { UserNoteSchema } from '../../../../mongodb/schema/note/user-note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { DeepPartial } from '../types';

import { TestNoteCategory } from './populate';

export interface FakeUserNoteOptions {
  override?: DeepPartial<UserNoteSchema>;
}

export function fakeUserNote(
  user: Pick<UserSchema, '_id'>,
  options?: FakeUserNoteOptions
): UserNoteSchema {
  return {
    userId: user._id,
    readOnly: !!faker.number.int({ max: 1 }),
    categoryName: TestNoteCategory.MAIN,
    ...options?.override,
    preferences: {
      backgroundColor: faker.color.rgb(),
      ...options?.override?.preferences,
    },
  };
}
