import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { isNoteEditable } from '../utils/is-note-editable';

const UseIsNoteEditable_Query = gql(`
  query UseIsNoteEditable_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName        
      }
    }
  }
`);

/**
 * Note is editable if it exists and is not in trash
 */
export function useIsNoteEditable() {
  const userId = useUserId();
  const noteId = useNoteId();

   
  const { data } = useQuery(UseIsNoteEditable_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data) {
    return false;
  }

   
  return isNoteEditable(data.signedInUser.noteLink.categoryName);
}
