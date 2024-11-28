import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';

const UseCollabService_Query = gql(`
  query UseCollabService_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) @client {
      id
      note {
        id
        collabService
      }
    }
  }
`);

export function useCollabService() {
  const noteId = useNoteId();
  const { data } = useQuery(UseCollabService_Query, {
    variables: {
      by: {
        noteId,
      },
    },
  });

  if (!data) {
    throw new Error(`Failed to query CollabService for note "${noteId}"`);
  }

  return data.userNoteLink.note.collabService;
}
