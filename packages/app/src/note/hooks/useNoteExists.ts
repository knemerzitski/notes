import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { Note } from '../../__generated__/graphql';

const UseNoteExists_Query = gql(`
  query UseNoteExists_Query($by: UserNoteLinkByInput!){
    userNoteLink(by: $by){
      id
    }
  }
`);

/**
 * @returns Boolean note exists, null if not known yet.
 */
export function useNoteExists(noteId: Note['id']) {
  const { data, loading } = useQuery(UseNoteExists_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      by: {
        noteId,
      },
    },
  });

  if (loading) {
    return null;
  }

  if (!data) {
    return false;
  }

  return true;
}
