import { QueryableNote } from '../../../mongodb/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';

export interface NoteMapper {
  readonly query: MongoQueryFn<typeof QueryableNote>;
}
