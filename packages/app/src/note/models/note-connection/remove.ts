import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';
import { getConnectionCategoryName } from '../note/connection-category-name';

const RemoveNoteFromConnection_Query = gql(`
  query RemoveNoteFromConnection_Query($category: NoteCategory!) {
    userNoteLinkConnection(category: $category) {
      edges {
        node {
          id
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
      }
    }
  }
`);

export function removeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery' | 'evict' | 'identify'>
) {
  const categoryName = getConnectionCategoryName(by, cache);
  if (!categoryName) {
    return;
  }

  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  cache.updateQuery(
    {
      query: RemoveNoteFromConnection_Query,
      variables: {
        category: categoryName,
      },
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }

      const index = data.userNoteLinkConnection.edges.findIndex(
        (edge) => edge.node.id === userNoteLinkId
      );
      if (index === -1) {
        return;
      }

      return {
        ...data,
        userNoteLinkConnection: {
          ...data.userNoteLinkConnection,
          edges: [
            ...data.userNoteLinkConnection.edges.slice(0, index),
            ...data.userNoteLinkConnection.edges.slice(index + 1),
          ],
        },
      };
    }
  );

  cache.evict({
    fieldName: 'connectionCategoryName',
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: userNoteLinkId,
    }),
  });
}
