import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';

const ExcludeNoteFromConnection_Query = gql(`
  query ExcludeNoteFromConnection_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      excludeFromConnection
    }
  }
`);

export function excludeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readQuery'>
) {
  return cache.writeQuery({
    query: ExcludeNoteFromConnection_Query,
    variables: {
      by,
    },
    data: {
      __typename: 'Query',
      userNoteLink: {
        __typename: 'UserNoteLink',
        id: getUserNoteLinkIdFromByInput(by, cache),
        excludeFromConnection: true,
      },
    },
  });
}
