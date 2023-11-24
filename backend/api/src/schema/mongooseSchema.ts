import { Note } from './note/mongoose';
import { Session } from './session/mongoose';
import { User } from './user/mongoose';

const mongooseSchema = {
  User,
  Session,
  Note,
};

export default mongooseSchema;
