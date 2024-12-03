import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';

const UseIsLocalOnlyNote_Query = gql(`
  query UseIsLocalOnlyNote_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        localOnly
      }
    }
  }
`);

export function useIsLocalOnlyNote() {
  const noteId = useNoteId();
  const { data } = useQuery(UseIsLocalOnlyNote_Query, {
    variables: {
      id: noteId,
    },
    fetchPolicy: 'cache-only',
  });

  return data?.userNoteLink.note.localOnly ?? false;
}
