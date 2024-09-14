import { ObjectId } from 'mongodb';
import { QueryableNote } from '../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../mongodb/query/query';

export function Note_id(noteId: ObjectId): ObjectId {
  return noteId;
}

export async function Note_id_fromQueryFn(
  query: MongoQueryFn<typeof QueryableNote>
): Promise<ObjectId | undefined> {
  return (await query({ _id: 1 }))?._id;
}
