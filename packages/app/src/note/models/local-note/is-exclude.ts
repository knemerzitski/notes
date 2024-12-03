import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const IsExcludeNoteFromConnection_Query = gql(`
  query IsExcludeNoteFromConnection_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      excludeFromConnection
    }
  }
`);

export function isExcludeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: IsExcludeNoteFromConnection_Query,
    variables: {
      by,
    },
  });

  return data?.userNoteLink.excludeFromConnection ?? false;
}
