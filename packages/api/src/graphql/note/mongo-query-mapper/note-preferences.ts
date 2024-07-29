import { MongoQuery } from '../../../mongodb/query/query';
import { UserNoteSchema } from '../../../mongodb/schema/user-note/user-note';
import { NotePreferencesMapper } from '../schema.mappers';

export class NotePreferencesQueryMapper implements NotePreferencesMapper {
  private preferences: MongoQuery<UserNoteSchema['preferences']>;

  constructor(preferences: MongoQuery<UserNoteSchema['preferences']>) {
    this.preferences = preferences;
  }

  async backgroundColor() {
    return (await this.preferences.query({ backgroundColor: 1 }))?.backgroundColor;
  }
}
