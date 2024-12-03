import { gql, useQuery } from '@apollo/client';

import { useNoteId } from '../context/note-id';
import { isNoteEditable } from '../utils/is-note-editable';

const UseIsNoteEditable_Query = gql(`
  query UseIsNoteEditable_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) {
      id
      categoryName
    }
  }
`);

/**
 * Note is editable if it exists and is not in trash
 */
export function useIsNoteEditable() {
  const noteId = useNoteId();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data } = useQuery(UseIsNoteEditable_Query, {
    variables: {
      id: noteId,
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  return isNoteEditable(data.userNoteLink.categoryName);
}
