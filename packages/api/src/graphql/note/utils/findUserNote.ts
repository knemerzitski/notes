import { ObjectId } from 'mongodb';

import { DeepQueryResult } from '../../../mongodb/query/query';
import { NoteSchema } from '../../../mongodb/schema/note/note';

export default function findUserNote(
  findUserId: ObjectId,
  note?: DeepQueryResult<NoteSchema>
) {
  return note?.userNotes?.find(({ userId }) => userId?.equals(findUserId));
}
