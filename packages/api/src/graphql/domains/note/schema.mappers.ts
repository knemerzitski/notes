import { QueryableNote } from '../../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';

export interface NoteMapper {
  readonly query: MongoQueryFn<QueryableNote>;
}
