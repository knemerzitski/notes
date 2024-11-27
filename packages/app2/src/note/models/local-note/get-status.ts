import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const GetNoteCreateStatus_Query = gql(`
  query GetNoteCreateStatus_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      pendingStatus
    }
  }
`);

export function getNoteCreateStatus(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: GetNoteCreateStatus_Query,
    variables: {
      by,
    },
  });

  return data?.userNoteLink.pendingStatus;
}
