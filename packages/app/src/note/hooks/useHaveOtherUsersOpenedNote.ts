import { useApolloClient } from '@apollo/client';
import { useEffect, useState } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';

const UseHaveMultipleUsersOpenedNote_NoteFragment = gql(`
  fragment UseHaveMultipleUsersOpenedNote_NoteFragment on Note {
    id
    users {
      id
      open {
        active @client
      }
      user {
        id
      }
    }
  }
`);

export function useHaveOtherUsersOpenedNote() {
  const client = useApolloClient();

  const userId = useUserId();
  const noteId = useNoteId();

  const [haveMultipleUsersOpenedNote, setHaveMultipleUsersOpenedNote] = useState(false);

  useEffect(() => {
    const obs = client.watchFragment({
      fragment: UseHaveMultipleUsersOpenedNote_NoteFragment,
      fragmentName: 'UseHaveMultipleUsersOpenedNote_NoteFragment',
      from: {
        __typename: 'Note',
        id: noteId,
      },
    });

    const sub = obs.subscribe({
      next({ data: note, complete }) {
        if (!complete) {
          setHaveMultipleUsersOpenedNote(false);
        } else {
          const userLinks = note.users.filter(
            (userLink) => userLink.open?.active && userLink.user.id !== userId
          );

          setHaveMultipleUsersOpenedNote(userLinks.length >= 1);
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  });

  return haveMultipleUsersOpenedNote;
}
