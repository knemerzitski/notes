import { useQuery } from '@apollo/client';
import { RefObject } from 'react';

import { gql } from '../../__generated__';

import { UserIdProvider, useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';

import { UserCollabEditingCaret } from './UserCollabEditingCaret';

//UserCollabEditingCaret

const _CollabInputUsersEditingCarets_NoteFragment = gql(`
  fragment CollabInputUsersEditingCarets_NoteFragment on Note {
    id
    users {
      ...UserCollabEditingCaret_UserNoteLinkFragment
    }
  }
`);

const CollabInputUsersEditingCarets_Query = gql(`
  query CollabInputUsersEditingCarets_Query($by: NoteByInput!) {
    note(by: $by){
      id
      users {
        id
        user {
          id
        }
      }
    }
  }
`);

export function CollabInputUsersEditingCarets({
  inputRef,
}: {
  inputRef: RefObject<unknown>;
}) {
  const noteId = useNoteId();
  const currentUserId = useUserId();
  const { data } = useQuery(CollabInputUsersEditingCarets_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      by: {
        id: noteId,
      },
    },
  });

  if (!data) {
    return null;
  }

  return (
    data.note.users
      // No caret for current user
      .filter((noteUser) => noteUser.user.id !== currentUserId)
      .map((noteUser) => (
        <UserIdProvider key={noteUser.user.id} userId={noteUser.user.id}>
          <UserCollabEditingCaret inputRef={inputRef} />
        </UserIdProvider>
      ))
  );
}
