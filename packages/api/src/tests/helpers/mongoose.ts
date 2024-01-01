import { createConnection } from 'mongoose';

import { noteSchema } from '../../mongoose/models/note';
import { DBSession, SessionModel, sessionSchema } from '../../mongoose/models/session';
import { userSchema } from '../../mongoose/models/user';
import { userNoteSchema } from '../../mongoose/models/user-note';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.TEST_MONGODB_URI!;

export const testConnection = await createConnection(DB_URI).asPromise();

export const User = testConnection.model('User', userSchema);
export const Session = testConnection.model<DBSession, SessionModel>(
  'Session',
  sessionSchema
);
export const Note = testConnection.model('Note', noteSchema);
export const UserNote = testConnection.model('UserNote', userNoteSchema);

export function resetDatabase() {
  return Promise.all([
    User.deleteMany(),
    Session.deleteMany(),
    Note.deleteMany(),
    UserNote.deleteMany(),
  ]);
}
