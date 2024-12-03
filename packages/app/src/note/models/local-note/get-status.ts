import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const GetNotePendingStatus_Query = gql(`
  query GetNotePendingStatus_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      pendingStatus
    }
  }
`);

export function getNotePendingStatus(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: GetNotePendingStatus_Query,
    variables: {
      by,
    },
  });

  return data?.userNoteLink.pendingStatus;
}
