import { Connection } from 'mongoose';

import { NoteModel, noteSchema } from './note/mongoose';
import { SessionModel, sessionSchema } from './session/mongoose';
import { UserModel, userSchema } from './user/mongoose';
import { UserNoteModel, userNoteSchema } from './user-note/mongoose';

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
