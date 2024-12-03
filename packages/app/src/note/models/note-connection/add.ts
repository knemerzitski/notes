import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  AddNoteToConnectionQueryQuery,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput } from '../../utils/id';
import { getCategoryName } from '../note/category-name';
import { noteExists } from '../note/exists';

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

  const categoryName = getCategoryName(by, cache) ?? NoteCategory.DEFAULT;

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

  cache.updateQuery(
    {
      query: AddNoteToConnection_Query,
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
