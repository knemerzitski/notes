import isDefined from '~utils/type-guards/isDefined';

import { DeepQueryResult } from '../../../mongodb/query/query';
import { NoteSchema } from '../../../mongodb/schema/note/note';

export default function findNoteOwners(note?: DeepQueryResult<NoteSchema>) {
  return (
    note?.userNotes
      ?.filter(({ isOwner }) => isOwner)
      .map(({ userId }) => userId)
      .filter(isDefined) ?? []
  );
}
