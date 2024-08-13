import { ObjectId } from 'mongodb';

import { DeepQueryResult } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';

export function findNoteUser(
  findUserId: ObjectId,
  note?: DeepQueryResult<QueryableNote> | null
) {
  return note?.users?.find(({ _id: userId }) => findUserId.equals(userId));
}

export function findOldestNoteUser(note?: DeepQueryResult<QueryableNote> | null) {
  return note?.users?.reduce((oldest, user) => {
    if (!user.createdAt) return oldest;
    if (!oldest.createdAt) return user;
    return oldest.createdAt < user.createdAt ? oldest : user;
  });
}
