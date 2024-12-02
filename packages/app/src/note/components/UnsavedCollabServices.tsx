import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { CollabService } from './CollabService';
import { NoteIdProvider } from '../context/note-id';
import { useUserId } from '../../user/context/user-id';

const UnsavedCollabServices_Query = gql(`
  query UnsavedCollabServices_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        unsavedCollabServices {
          id
          note {
            id
          }
        }
      }
    }
  }
`);

export function UnsavedCollabServices() {
  const userId = useUserId();
  const { data } = useQuery(UnsavedCollabServices_Query, {
    variables: {
      id: userId,
    },
  });

  return (
    data?.signedInUser?.local.unsavedCollabServices.map(({ note }) => (
      <NoteIdProvider key={note.id} noteId={note.id}>
        <CollabService />
      </NoteIdProvider>
    )) ?? null
  );
}