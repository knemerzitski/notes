import { MongoDocumentQuery } from '../../../mongodb/query-builder';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';
import { NotePreferencesMapper } from '../schema.mappers';

export type NotePreferencesQuery = UserNoteSchema['preferences'];

export class NotePreferencesQueryMapper implements NotePreferencesMapper {
  private query: MongoDocumentQuery<NotePreferencesQuery>;

  constructor(query: MongoDocumentQuery<NotePreferencesQuery>) {
    this.query = query;
  }

  async backgroundColor() {
    return (await this.query.queryDocument({ backgroundColor: 1 }))?.backgroundColor;
  }
}
