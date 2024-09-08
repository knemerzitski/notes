import { ObjectId } from 'mongodb';
import { objectIdToStr } from '../../mongodb/utils/objectid';
import { QueryableNote } from '../../mongodb/descriptions/note';
import { MongoQueryFn } from '../../mongodb/query/query';

export function UserNoteLink_id(noteId: ObjectId, userId: ObjectId): string {
  return idAsString(noteId, userId);
}

export async function UserNoteLink_id_fromQueryFn(
  query: MongoQueryFn<typeof QueryableNote>,
  userId: ObjectId
): Promise<string | null> {
  const noteId = (
    await query({
      _id: 1,
    })
  )?._id;
  if (!noteId) return null;

  return idAsString(noteId, userId);
}

function idAsString(noteId: ObjectId, userId: ObjectId) {
  return `${objectIdToStr(noteId)}:${objectIdToStr(userId)}`;
}
