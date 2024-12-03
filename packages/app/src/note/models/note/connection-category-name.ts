import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const ConnectionCategoryName_Query = gql(`
  query ConnectionCategoryName_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      categoryName
      connectionCategoryName
    }
  }
`);

export function getConnectionCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: ConnectionCategoryName_Query,
    variables: {
      by,
    },
  });

  return data?.userNoteLink.connectionCategoryName;
}

/**
 * Update field `connectionCategoryName` with value from `categoryName` if it's not defined
 */
export function updateConnectionCategoryName(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'updateQuery'>
) {
  cache.updateQuery(
    {
      query: ConnectionCategoryName_Query,
      variables: {
        by,
      },
    },
    (data) => {
      if (!data) {
        return;
      }

      return {
        ...data,
        userNoteLink: {
          ...data.userNoteLink,
          connectionCategoryName:
            data.userNoteLink.connectionCategoryName ?? data.userNoteLink.categoryName,
        },
      };
    }
  );
}
