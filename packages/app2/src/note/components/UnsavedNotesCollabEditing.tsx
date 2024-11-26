import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { CollabEditing } from './CollabEditing';
import { NoteIdProvider } from '../context/note-id';
import { useUserId } from '../../user/context/user-id';

const UnsavedNotesCollabEditing_Query = gql(`
  query UnsavedNotesCollabEditing_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        unsavedNotes {
          id
          note {
            id
          }
        }
      }
    }
  }
`);

export function UnsavedNotesCollabEditing() {
  const userId = useUserId();
  const { data } = useQuery(UnsavedNotesCollabEditing_Query, {
    variables: {
      id: userId,
    },
  });

  return (
    data?.signedInUser?.local.unsavedNotes.map(({ note }) => (
      <NoteIdProvider key={note.id} noteId={note.id}>
        <CollabEditing />
      </NoteIdProvider>
    )) ?? null
  );
}
