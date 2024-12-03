import { useQuery } from '@apollo/client';

import { CollabService } from '~collab/client/collab-service';

import { Maybe } from '~utils/types';

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

export function useCollabService(nullable: true): Maybe<CollabService>;
export function useCollabService(nullable?: false): CollabService;
export function useCollabService(nullable?: boolean): Maybe<CollabService> {
  const noteId = useNoteId();
  const { data } = useQuery(UseCollabService_Query, {
    variables: {
      by: {
        noteId,
      },
    },
  });

  if (!data && !nullable) {
    throw new Error(`Failed to query CollabService for note "${noteId}"`);
  }

  return data?.userNoteLink.note.collabService;
}
