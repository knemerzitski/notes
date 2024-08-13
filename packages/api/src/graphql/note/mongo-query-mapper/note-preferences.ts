import { MongoQuery } from '../../../mongodb/query/query';
import { NoteUserSchema } from '../../../mongodb/schema/note/note-user';
import { NotePreferencesMapper } from '../schema.mappers';

export class NotePreferencesQueryMapper implements NotePreferencesMapper {
  private preferences: MongoQuery<NoteUserSchema['preferences']>;

  constructor(preferences: MongoQuery<NoteUserSchema['preferences']>) {
    this.preferences = preferences;
  }

  async backgroundColor() {
    return (await this.preferences.query({ backgroundColor: 1 }))?.backgroundColor;
  }
}
