import { ApolloCache } from '@apollo/client';

import { CollabService } from '~collab/client/collab-service';

import { gql } from '../../../__generated__';
import { NoteByInput } from '../../../__generated__/graphql';

const GetCollabService_Query = gql(`
  query GetCollabService_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      collabService
    }
  }
`);

export function getCollabService(
  by: NoteByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): CollabService {
  const data = cache.readQuery({
    query: GetCollabService_Query,
    variables: {
      by,
    },
  });

  if (!data) {
    throw new Error(`Note "${by.id}" not found`);
  }

  return data.note.collabService;
}
