import { afterAll, beforeAll } from 'vitest';

import { testConnection, Note, User, UserNote, Session } from './mongoose';

beforeAll(async () => {
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
