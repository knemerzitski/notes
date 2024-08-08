import { ObjectId } from 'mongodb';

import { DeepQueryResult } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';

export function findUserNote(
  findUserId: ObjectId,
  note?: DeepQueryResult<QueryableNote> | null
) {
  return note?.userNotes?.find(({ userId }) => userId?.equals(findUserId));
}
