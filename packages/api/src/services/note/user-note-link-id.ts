import { ObjectId } from 'mongodb';
import { objectIdToStr, strToObjectId } from '../../mongodb/utils/objectid';
import { QueryableNote } from '../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../mongodb/query/query';

export class UserNoteLinkId {
  constructor(
    readonly noteId: ObjectId,
    readonly userId: ObjectId
  ) {}

  serialize() {
    return idAsString(this.noteId, this.userId);
  }

  static parseValue(value: unknown): UserNoteLinkId {
    if (value instanceof UserNoteLinkId) {
      return value;
    }

    if (typeof value === 'string') {
      const result = parseUserNoteLinkId(value);
      if (result !== false) {
        return result;
      } else {
        throw new Error('Value must be a valid UserNoteLinkId string');
      }
    } else {
      throw new Error('Value must be a String');
    }
  }
}

export function UserNoteLink_id(noteId: ObjectId, userId: ObjectId): string {
  return idAsString(noteId, userId);
}

export async function UserNoteLink_id_fromQueryFn(
  query: MongoQueryFn<QueryableNote>,
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

function idAsString(noteId: ObjectId, userId: ObjectId): string {
  return `${objectIdToStr(noteId)}:${objectIdToStr(userId)}`;
}

export function parseUserNoteLinkId(id: string): UserNoteLinkId | false {
  const [noteIdStr, userIdStr] = id.split(':');

  const noteId = strToObjectId(noteIdStr);
  const userId = strToObjectId(userIdStr);

  if (!noteId || !userId) {
    return false;
  }

  return new UserNoteLinkId(noteId, userId);
}
