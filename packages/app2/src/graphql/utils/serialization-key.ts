import { Note, SignedInUser } from '../../__generated__/graphql';

type UserSerializationType = 'displayName';

export function userSerializationKey(
  userId: SignedInUser['id'],
  type: UserSerializationType
) {
  return `User:${userId}:${type}`;
}


