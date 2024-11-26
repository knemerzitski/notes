import { ApolloCache } from '@apollo/client';
import {
  AddNoteToConnectionQueryQuery,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';
import { getConnectionCategoryName } from '../note/connection-category-name';
import { noteExists } from '../note/exists';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';

const AddNoteToConnection_Query = gql(`
  query AddNoteToConnection_Query($by: UserNoteLinkByInput!, $category: NoteCategory!) {
    userNoteLink(by: $by){
      id
      categoryName
      connectionCategoryName
    }

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

export function addNoteToConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery'>
) {
  if (!noteExists(by, cache)) {
    return false;
  }

  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  const categoryName = getConnectionCategoryName(by, cache) ?? NoteCategory.DEFAULT;

  const newEdge: AddNoteToConnectionQueryQuery['userNoteLinkConnection']['edges'][0] & {
    node: AddNoteToConnectionQueryQuery['userNoteLink'];
  } = {
    __typename: 'UserNoteLinkEdge' as const,
    node: {
      __typename: 'UserNoteLink' as const,
      id: userNoteLinkId,
      connectionCategoryName: categoryName,
      categoryName: categoryName,
    },
  };

  // TODO correct pageInfo too?, need it on add?
  cache.updateQuery(
    {
      query: AddNoteToConnection_Query,
      variables: {
        by,
        category: categoryName,
      },
      // TODO overwrite all updates?
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }

      if (
        data.userNoteLinkConnection.edges.some((edge) => edge.node.id === newEdge.node.id)
      ) {
        return;
      }

      return {
        ...data,
        userNoteLink: newEdge.node,
        userNoteLinkConnection: {
          ...data.userNoteLinkConnection,
          edges: [newEdge, ...data.userNoteLinkConnection.edges],
        },
      };
    }
  );

  return true;
}
