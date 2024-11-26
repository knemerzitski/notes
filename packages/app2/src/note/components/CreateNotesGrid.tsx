import { gql } from '../../__generated__';
import { NotesCardGrid } from './NotesCardGrid';
import { useQuery } from '@apollo/client';
import { useUserId } from '../../user/context/user-id';
import { NoteIdsProvider } from '../context/note-ids';

// TODO query in route loader

const CreateNotesGrid_Query = gql(`
  query CreateNotesGrid_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        createNotes {
          id
          note {
            id
          }
          ...NotesCardGrid_UserNoteLinkFragment
        }
      }
    }
  }
`);

export function CreateNotesGrid() {
  const userId = useUserId();
  const { data } = useQuery(CreateNotesGrid_Query, {
    variables: {
      id: userId,
    },
  });

  if (!data?.signedInUser) {
    return null;
  }

  const noteIds = data.signedInUser.local.createNotes.map((noteLink) => noteLink.note.id);

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <NotesCardGrid />
    </NoteIdsProvider>
  );
}
