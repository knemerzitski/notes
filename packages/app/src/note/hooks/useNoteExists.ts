import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { Note } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';

const UseNoteExists_Query = gql(`
  query UseNoteExists_Query($userBy: UserByInput!, $noteBy: NoteByInput!){
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
      }
    }
  }
`);

/**
 * @returns Boolean note exists for current user, null if not known yet.
 */
export function useNoteExists(noteId: Note['id']) {
  const userId = useUserId();

  const { data, loading } = useQuery(UseNoteExists_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
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
