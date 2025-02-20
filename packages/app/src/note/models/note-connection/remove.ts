import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../../utils/id';
import { getCategoryName } from '../note/category-name';

const RemoveNoteFromConnection_Query = gql(`
  query RemoveNoteFromConnection_Query($userBy: UserByInput!, $category: NoteCategory!) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: $category) {
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
  }
`);

export function removeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery' | 'evict' | 'identify'>,
  categoryName = getCategoryName(by, cache)
) {
  const { noteId, userId } = parseUserNoteLinkByInput(by, cache);
  const userNoteLinkId = getUserNoteLinkId(noteId, userId);

  cache.updateQuery(
    {
      query: RemoveNoteFromConnection_Query,
      variables: {
        userBy: {
          id: userId,
        },
        category: categoryName,
      },
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }

      const index = data.signedInUser.noteLinkConnection.edges.findIndex(
        (edge) => edge.node.id === userNoteLinkId
      );
      if (index === -1) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          noteLinkConnection: {
            ...data.signedInUser.noteLinkConnection,
            edges: [
              ...data.signedInUser.noteLinkConnection.edges.slice(0, index),
              ...data.signedInUser.noteLinkConnection.edges.slice(index + 1),
            ],
          },
        },
      };
    }
  );
}
