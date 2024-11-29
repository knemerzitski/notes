import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { CollabService } from '~collab/client/collab-service';

const GetCollabService_Query = gql(`
  query GetCollabService_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      note {
        id
        collabService
      }
    }
  }
`);

export function getCollabService(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): CollabService {
  const data = cache.readQuery({
    query: GetCollabService_Query,
    variables: {
      by,
    },
  });

  if (!data) {
    throw new Error(`Note "${by.noteId ?? by.id ?? by.userNoteLinkId}" not found`);
  }

  return data.userNoteLink.note.collabService;
}
