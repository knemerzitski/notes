import { MongoQueryFn } from '../../mongodb/query/query';
import { QueryableNote } from '../../mongodb/descriptions/note';

export interface NoteMapper {
  readonly query: MongoQueryFn<QueryableNote>;
}
