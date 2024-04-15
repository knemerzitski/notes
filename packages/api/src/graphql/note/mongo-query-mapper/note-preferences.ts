import { NotePreferencesMapper } from '../schema.mappers';
import { UserNoteSchema } from '../../../mongodb/collections/user-note';
import { MongoDocumentQuery } from '../../../mongodb/query-builder';

export type NotePreferencesQueryType = UserNoteSchema['preferences'];

export class NotePreferencesQuery implements NotePreferencesMapper {
  private query: MongoDocumentQuery<NotePreferencesQueryType>;

  constructor(query: MongoDocumentQuery<NotePreferencesQueryType>) {
    this.query = query;
  }

  async backgroundColor() {
    return (await this.query.queryDocument({ backgroundColor: 1 }))?.backgroundColor;
  }
}
