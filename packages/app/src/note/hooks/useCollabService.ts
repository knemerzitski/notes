import { useQuery } from '@apollo/client';

import { CollabService } from '../../../../collab/src/client/collab-service';
import { Maybe } from '../../../../utils/src/types';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';

const UseCollabService_Query = gql(`
  query UseCollabService_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      collabService
    }
  }
`);

export function useCollabService(nullable: true): Maybe<CollabService>;
export function useCollabService(nullable?: false): CollabService;
export function useCollabService(nullable?: boolean): Maybe<CollabService> {
  const noteId = useNoteId();
  const { data } = useQuery(UseCollabService_Query, {
    variables: {
      by: {
        id: noteId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  if (!data && !nullable) {
    throw new Error(`Failed to query CollabService for note "${noteId}"`);
  }

  return data?.note.collabService;
}
