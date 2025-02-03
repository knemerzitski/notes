import { Note, User } from '../../__generated__/graphql';

// TODO use @serialize directly if userId is only parameter

export function userSerializationKey_fieldDisplayName(userId: User['id']) {
  return `User:${userId}:displayName`;
}

export function noteSerializationKey_fieldText(
  noteId: Note['id'],
  userId: User['id']
) {
  return `Note:${noteId}:${userId}:insertText`;
}

export function noteSerializationKey_orderMatters(userId: User['id']) {
  return `Note:${userId}:orderMatters`;
}

export function noteSerializationKey_sharing(userId: User['id']) {
  return `Note:${userId}:sharing`;
}
