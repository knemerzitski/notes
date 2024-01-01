import { Connection } from 'mongoose';

import { NoteModel, noteSchema } from './models/note';
import { SessionModel, sessionSchema } from './models/session';
import { UserModel, userSchema } from './models/user';
import { UserNoteModel, userNoteSchema } from './models/user-note';

export interface MongooseModels {
  User: UserModel;
  Session: SessionModel;
  Note: NoteModel;
  UserNote: UserNoteModel;
}

export function createMongooseModels(connection: Connection): MongooseModels {
  return {
    User: connection.model('User', userSchema),
    Session: connection.model('Session', sessionSchema),
    Note: connection.model('Note', noteSchema),
    UserNote: connection.model('UserNote', userNoteSchema),
  };
}
