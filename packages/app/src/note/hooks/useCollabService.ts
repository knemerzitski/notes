import { useQuery } from '@apollo/client';

import { Maybe } from '../../../../utils/src/types';

import { CollabService } from '../../../../collab2/src';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';

const UseCollabService_Query = gql(`
  query UseCollabService_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        collabService
      }
    }
  }
`);

export function useCollabService(nullable: true): Maybe<CollabService>;
export function useCollabService(nullable?: false): CollabService;
export function useCollabService(nullable?: boolean): Maybe<CollabService> {
  const userId = useUserId();
  const noteId = useNoteId();
  const { data } = useQuery(UseCollabService_Query, {
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

  if (!data && !nullable) {
    throw new Error(`Failed to query CollabService for note "${noteId}"`);
  }

  return data?.signedInUser.noteLink.collabService;
}
