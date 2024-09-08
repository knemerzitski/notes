import { QueryableNote } from "../../../mongodb/descriptions/note";
import { MongoQueryFn } from "../../../mongodb/query/query";




export interface NoteShareAccessMapper {
  query: MongoQueryFn<typeof QueryableNote>;
}