import { NotePreferencesMapper } from '../schema.mappers';
import { DBUserNote } from '../../../mongoose/models/user-note';
import { MongoDocumentQuery } from '../../../mongoose/query-builder';

export type NotePreferencesQueryType = DBUserNote['preferences'];

export class NotePreferencesQuery implements NotePreferencesMapper {
  private query: MongoDocumentQuery<NotePreferencesQueryType>;

  constructor(query: MongoDocumentQuery<NotePreferencesQueryType>) {
    this.query = query;
  }

  async backgroundColor() {
    return (await this.query.queryDocument({ backgroundColor: 1 }))?.backgroundColor;
  }
}
