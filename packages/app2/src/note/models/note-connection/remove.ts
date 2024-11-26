import { ApolloCache } from '@apollo/client';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';
import { getConnectionCategoryName } from '../note/connection-category-name';

const RemoveNoteFromConnection_Query = gql(`
  query RemoveNoteFromConnection_Query($by: UserNoteLinkByInput!, $category: NoteCategory!) {
    userNoteLink(by: $by){
      id
      connectionCategoryName
    }

    userNoteLinkConnection(category: $category) {
      edges {
        node {
          id
        }
        cursor
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
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery'>
) {
  const categoryName = getConnectionCategoryName(by, cache);
  if (!categoryName) {
    return;
  }

  cache.updateQuery(
    {
      query: RemoveNoteFromConnection_Query,
      variables: {
        by,
        category: categoryName,
      },
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }

      const index = data.userNoteLinkConnection.edges.findIndex(
        (edge) => edge.node.id === data.userNoteLink.id
      );
      if (index === -1) {
        return;
      }

      return {
        ...data,
        userNoteLink: {
          ...data.userNoteLink,
          connectionCategoryName: null,
        },
        notesConnection: {
          ...data.userNoteLinkConnection,
          edges: [
            ...data.userNoteLinkConnection.edges.slice(0, index),
            ...data.userNoteLinkConnection.edges.slice(index + 1),
          ],
        },
      };
    }
  );
}
