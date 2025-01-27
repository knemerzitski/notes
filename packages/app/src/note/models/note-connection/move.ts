import { ApolloCache } from '@apollo/client';
import { Maybe } from '~utils/types';

import { gql } from '../../../__generated__';
import {
  NoteLocation,
  NoteCategory,
  MovableNoteCategory,
  ListAnchorPosition,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../../utils/id';
import { getConnectionCategoryName } from '../note/connection-category-name';
import { noteExists } from '../note/exists';

const MoveNoteInConnection_Query = gql(`
  query MoveNoteInConnection_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!, $oldCategory: NoteCategory, $newCategory: NoteCategory) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        categoryName
        connectionCategoryName
      }
    }

    oldConnection: userNoteLinkConnection(category: $oldCategory) {
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
    newConnection: userNoteLinkConnection(category: $newCategory) {
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

export function moveNoteInConnection(
  by: UserNoteLinkByInput,
  location: Pick<NoteLocation, 'anchorPosition'> & {
    anchorUserNoteLink?: Maybe<
      Pick<NonNullable<NoteLocation['anchorUserNoteLink']>, 'id'>
    >;
    categoryName: NoteCategory | MovableNoteCategory;
  },
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery'>
) {
  if (!noteExists(by, cache)) {
    return false;
  }

  const userNoteLinkId = getUserNoteLinkIdFromByInput(by, cache);

  const oldCategoryName = getConnectionCategoryName(by, cache) ?? NoteCategory.DEFAULT;
  const newCategoryName = location.categoryName as NoteCategory;

  const newEdge = {
    __typename: 'UserNoteLinkEdge' as const,
    node: {
      __typename: 'UserNoteLink' as const,
      id: userNoteLinkId,
      connectionCategoryName: newCategoryName,
      categoryName: newCategoryName,
    },
  };

  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  cache.updateQuery(
    {
      query: MoveNoteInConnection_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
        oldCategory: oldCategoryName,
        newCategory: newCategoryName,
      },
      overwrite: true,
    },
    (data) => {
      if (!data) {
        return;
      }
      const oldList = data.oldConnection.edges;
      const newList = data.newConnection.edges;

      const oldFromIndex = oldList.findIndex((edge) => edge.node.id === newEdge.node.id);

      const anchorNoteLink = location.anchorUserNoteLink;
      const anchorToIndex = anchorNoteLink
        ? newList.findIndex((edge) => edge.node.id === anchorNoteLink.id)
        : -1;
      const position = location.anchorPosition ?? ListAnchorPosition.AFTER;

      const oldFromFound = oldFromIndex >= 0;
      const anchorToFound = anchorToIndex >= 0;

      if (oldFromFound && anchorToFound) {
        if (oldCategoryName === newCategoryName) {
          if (oldFromIndex == anchorToIndex) {
            // Anchor is same as moving note, final order won't change
            return;
          }

          const positionIndex =
            anchorToIndex + (position === ListAnchorPosition.AFTER ? 1 : 0);

          const finalIndex = positionIndex + (oldFromIndex < anchorToIndex ? -1 : 0);

          if (oldFromIndex === finalIndex) {
            // Already pointing to same index, no move needed
            return;
          }

          // Remove at oldFromIndex, add at finalIndex
          const newEdges = [...newList];
          const [moveEdge] = newEdges.splice(oldFromIndex, 1);
          if (moveEdge) {
            newEdges.splice(finalIndex, 0, moveEdge);
          }

          return {
            ...data,
            signedInUser: {
              ...data.signedInUser,
              noteLink: newEdge.node,
            },
            newConnection: {
              ...data.newConnection,
              edges: newEdges,
            },
          };
        } else {
          const finalIndex =
            anchorToIndex + (position === ListAnchorPosition.AFTER ? 1 : 0);
          return {
            ...data,
            signedInUser: {
              ...data.signedInUser,
              noteLink: newEdge.node,
            },
            oldConnection: {
              ...data.oldConnection,
              edges: [
                ...oldList.slice(0, oldFromIndex),
                ...oldList.slice(oldFromIndex + 1),
              ],
            },
            newConnection: {
              ...data.newConnection,
              edges: [
                ...newList.slice(0, finalIndex),
                newEdge,
                ...newList.slice(finalIndex),
              ],
            },
          };
        }
      } else if (anchorToFound) {
        // Note is not in any category
        const finalIndex =
          anchorToIndex + (position === ListAnchorPosition.AFTER ? 1 : 0);

        return {
          ...data,
          signedInUser: {
            ...data.signedInUser,
            noteLink: newEdge.node,
          },
          // Add at anchor
          newConnection: {
            ...data.newConnection,
            edges: [
              ...newList.slice(0, finalIndex),
              newEdge,
              ...newList.slice(finalIndex),
            ],
          },
        };
      } else {
        if (oldFromFound) {
          if (oldCategoryName === newCategoryName) {
            // Already in correct category
            return;
          }

          // Note is in category
          // No/invalid anchor, insert at 0
          return {
            ...data,
            signedInUser: {
              ...data.signedInUser,
              noteLink: newEdge.node,
            },
            // Remove from old
            oldConnection: {
              ...data.oldConnection,
              edges: [
                ...oldList.slice(0, oldFromIndex),
                ...oldList.slice(oldFromIndex + 1),
              ],
            },
            // Add to new at 0
            newConnection: {
              ...data.newConnection,
              edges: [newEdge, ...newList],
            },
          };
        } else {
          // Note is not in any category
          // No/invalid anchor, insert at 0
          return {
            ...data,
            signedInUser: {
              ...data.signedInUser,
              noteLink: newEdge.node,
            },
            // Add to new at 0
            newConnection: {
              ...data.newConnection,
              edges: [newEdge, ...newList],
            },
          };
        }
      }
    }
  );

  return true;
}
