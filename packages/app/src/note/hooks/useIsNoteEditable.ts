import { useQuery } from '@apollo/client';

import { useNoteId } from '../context/note-id';
import { isNoteEditable } from '../utils/is-note-editable';
import { useUserId } from '../../user/context/user-id';
import { gql } from '../../__generated__';

const UseIsNoteEditable_Query = gql(`
  query UseIsNoteEditable_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  return isNoteEditable(data.signedInUser.noteLink.categoryName);
}
