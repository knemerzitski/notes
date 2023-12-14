import { faker } from '@faker-js/faker';
import { afterAll, beforeAll } from 'vitest';

import { testConnection, Note, User, UserNote, Session } from './mongoose';

beforeAll(async () => {
  faker.seed(123);

  await Promise.all([
    User.syncIndexes(),
    Session.syncIndexes(),
    UserNote.syncIndexes(),
    Note.syncIndexes(),
  ]);
});

afterAll(async () => {
  await testConnection.close();
});
