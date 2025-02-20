import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  AddNoteToConnectionQueryQuery,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../../utils/id';
import { getCategoryName } from '../note/category-name';
import { noteExists } from '../note/exists';

const AddNoteToConnection_Query = gql(`
  query AddNoteToConnection_Query($userBy: UserByInput!, $noteBy: NoteByInput!, $category: NoteCategory!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
      }

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

export function addNoteToConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery'>
) {
  if (!noteExists(by, cache)) {
    return false;
  }

  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  const categoryName = getCategoryName(by, cache);

  const newEdge: AddNoteToConnectionQueryQuery['signedInUser']['noteLinkConnection']['edges'][0] & {
    node: AddNoteToConnectionQueryQuery['signedInUser']['noteLink'];
  } = {
    __typename: 'UserNoteLinkEdge' as const,
    node: {
      __typename: 'UserNoteLink' as const,
      id: userNoteLinkId,
      categoryName,
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
        data.signedInUser.noteLinkConnection.edges.some(
          (edge) => edge.node.id === newEdge.node.id
        )
      ) {
        return;
      }

      return {
        ...data,
        signedInUser: {
          ...data.signedInUser,
          noteLink: newEdge.node,
          noteLinkConnection: {
            ...data.signedInUser.noteLinkConnection,
            edges: [newEdge, ...data.signedInUser.noteLinkConnection.edges],
          },
        },
      };
    }
  );

  return true;
}
