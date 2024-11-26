import { Note, SignedInUser } from '../../__generated__/graphql';

// TODO use @serialize directly if userId is only parameter

export function userSerializationKey_fieldDisplayName(userId: SignedInUser['id']) {
  return `User:${userId}:displayName`;
}

export function noteSerializationKey_fieldText(
  noteId: Note['id'],
  userId: SignedInUser['id']
) {
  return `Note:${noteId}:${userId}:insertText`;
}

export function noteSerializationKey_orderMatters(userId: SignedInUser['id']) {
  return `Note:${userId}:orderMatters`;
}
