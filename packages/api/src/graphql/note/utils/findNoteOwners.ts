import isDefined from '~utils/type-guards/isDefined';

import { DeepQueryResult } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';

export default function findNoteOwners(note?: DeepQueryResult<QueryableNote>) {
  return (
    note?.userNotes
      ?.filter(({ isOwner }) => isOwner)
      .map(({ userId }) => userId)
      .filter(isDefined) ?? []
  );
}
