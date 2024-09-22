import { QueryableNote } from '../../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';

export interface NoteShareAccessMapper {
  query: MongoQueryFn<QueryableNote['shareLinks']>;
}
