import { MongoQueryFn } from '../../mongodb/query/query';
import { QueryableNote } from '../../mongodb/schema/note/query/queryable-note';

export interface NoteMapper {
  readonly query: MongoQueryFn<QueryableNote>;
}
