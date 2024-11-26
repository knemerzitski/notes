import { Note, SignedInUser } from '../../__generated__/graphql';

type UserSerializationType = 'displayName';

export function userSerializationKey(
  userId: SignedInUser['id'],
  type: UserSerializationType
) {
  return `User:${userId}:${type}`;
}

type NoteSerializationType = 'move' | 'insertText';

export function noteSerializationKey(
  noteId: Note['id'],
  userId: SignedInUser['id'],
  type: NoteSerializationType
) {
  return `Note:${noteId}:${userId}:${type}`;
}
