import { ApolloCache } from '@apollo/client';

import { CollabService } from '../../../../../collab2/src';

import { gql } from '../../../__generated__';
import { NoteByInput, UserByInput } from '../../../__generated__/graphql';

const GetCollabService_Query = gql(`
  query GetCollabService_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        collabService
      }
    }
  }
`);

export function getCollabService(
  userBy: UserByInput,
  noteBy: NoteByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): CollabService {
  const data = cache.readQuery({
    query: GetCollabService_Query,
    variables: {
      userBy,
      noteBy,
    },
  });

  if (!data) {
    throw new Error(`Note "${noteBy.id}" not found`);
  }

  return data.signedInUser.noteLink.collabService;
}
