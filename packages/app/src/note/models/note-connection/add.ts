import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  AddNoteToConnectionQueryQuery,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../../utils/id';
import { getCategoryName } from '../note/category-name';
import { noteExists } from '../note/exists';

const AddNoteToConnection_Query = gql(`
  query AddNoteToConnection_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!, $category: NoteCategory!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
      categoryName
      connectionCategoryName
      }
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
    node: AddNoteToConnectionQueryQuery['signedInUser']['noteLink'];
  } = {
    __typename: 'UserNoteLinkEdge' as const,
    node: {
      __typename: 'UserNoteLink' as const,
      id: userNoteLinkId,
      connectionCategoryName: categoryName,
      categoryName: categoryName,
    },
  };

  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: AddNoteToConnection_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
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
        signedInUser: {
          ...data.signedInUser,
          noteLink: newEdge.node,
        },
        userNoteLinkConnection: {
          ...data.userNoteLinkConnection,
          edges: [newEdge, ...data.userNoteLinkConnection.edges],
        },
      };
    }
  );

  return true;
}
