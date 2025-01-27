import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';

const UseIsLocalOnlyNote_Query = gql(`
  query UseIsLocalOnlyNote_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      localOnly
    }
  }
`);

export function useIsLocalOnlyNote() {
  const noteId = useNoteId();
  const { data } = useQuery(UseIsLocalOnlyNote_Query, {
    variables: {
      by: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  return data?.note.localOnly ?? false;
}
