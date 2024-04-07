import { createConnection } from 'mongoose';

import { noteSchema } from '../../mongoose/models/note';
import { DBSession, SessionModel, sessionSchema } from '../../mongoose/models/session';
import { userSchema } from '../../mongoose/models/user';
import { userNoteSchema } from '../../mongoose/models/user-note';
import { collaborativeDocumentSchema } from '../../mongoose/models/collab/collab-text';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DB_URI = process.env.TEST_MONGODB_URI!;

export const connection = await createConnection(DB_URI).asPromise();

export const mongoDb = connection.db;

export const User = connection.model('User', userSchema);
export const Session = connection.model<DBSession, SessionModel>(
  'Session',
  sessionSchema
);
export const CollaborativeDocument = connection.model(
  'CollaborativeDocument',
  collaborativeDocumentSchema
);
export const Note = connection.model('Note', noteSchema);
export const UserNote = connection.model('UserNote', userNoteSchema);

export function resetDatabase() {
  return Promise.all([
    User.deleteMany(),
    Session.deleteMany(),
    CollaborativeDocument.deleteMany(),
    Note.deleteMany(),
    UserNote.deleteMany(),
  ]);
}
