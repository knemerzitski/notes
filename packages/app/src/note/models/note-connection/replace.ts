import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import {
  ListAnchorPosition,
  MoveUserNoteLinkInput,
  NoteCategory,
  ReplaceNoteInConnectionQueryQuery,
  TrashUserNoteLinkInput,
  UserNoteLinkByInput,
} from '../../../__generated__/graphql';
import { getUserNoteLinkIdFromByInput, parseUserNoteLinkByInput } from '../../utils/id';
import { toMovableNoteCategory } from '../../utils/note-category';
import { getConnectionCategoryName } from '../note/connection-category-name';

import { moveNoteInConnection } from './move';

import { removeNoteFromConnection } from './remove';

const ReplaceNoteInConnection_Query = gql(`
  query ReplaceNoteInConnection_Query($userBy: SignedInUserByInput!, $category: NoteCategory!) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: $category) {
        edges {
          node {
            id
            note {
              id
              localOnly
            }
          }
        }
      }
    }
  }
`);

type Edge =
  ReplaceNoteInConnectionQueryQuery['signedInUser']['noteLinkConnection']['edges'][0];

/**
 * Locally moves new note to match location of old note.
 * Returns input to be sent to server for synchronization.
 */
export function replaceNoteInConnection(
  oldBy: UserNoteLinkByInput,
  newBy: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'updateQuery' | 'evict' | 'identify'>
):
  | { type: 'MoveUserNoteLinkInput'; input: MoveUserNoteLinkInput }
  | { type: 'TrashUserNoteLinkInput'; input: TrashUserNoteLinkInput }
  | undefined {
  const categoryName = getConnectionCategoryName(oldBy, cache) ?? NoteCategory.DEFAULT;
  const oldUserNoteLinkId = getUserNoteLinkIdFromByInput(oldBy, cache);
  const newUserNoteLinkId = getUserNoteLinkIdFromByInput(newBy, cache);
  const { userId, noteId: newNoteId } = parseUserNoteLinkByInput(newBy, cache);

  // Move new note next to old one
  moveNoteInConnection(
    newBy,
    {
      categoryName: categoryName,
      anchorUserNoteLink: {
        id: oldUserNoteLinkId,
      },
      anchorPosition: ListAnchorPosition.AFTER,
    },
    cache
  );

  // Remove old note from connection
  removeNoteFromConnection(oldBy, cache);

  //Find out where new note is relative to other remote notes to create a location input
  const data = cache.readQuery({
    query: ReplaceNoteInConnection_Query,
    variables: {
      userBy: {
        id: userId,
      },
      category: categoryName,
    },
  });

  if (!data) {
    return;
  }

  const edges = data.signedInUser.noteLinkConnection.edges;
  const newIndex = edges.findIndex((edge) => edge.node.id === newUserNoteLinkId);
  if (newIndex < 0) {
    return;
  }
  const anchorIndex = findClosestRemoteNote(newIndex, edges);
  if (anchorIndex < 0) {
    return;
  }
  const anchorNoteId = edges[anchorIndex]?.node.note.id;
  if (!anchorNoteId) {
    return;
  }

  const movableCategoryName = toMovableNoteCategory(categoryName);
  if (!movableCategoryName) {
    if (categoryName === NoteCategory.TRASH) {
      return {
        type: 'TrashUserNoteLinkInput',
        input: {
          authUser: {
            id: userId,
          },
          note: {
            id: newNoteId,
          },
        },
      };
    }
    return;
  }

  return {
    type: 'MoveUserNoteLinkInput',
    input: {
      authUser: {
        id: userId,
      },
      note: {
        id: newNoteId,
      },
      location: {
        anchorNoteId,
        categoryName: movableCategoryName,
        anchorPosition:
          anchorIndex < newIndex ? ListAnchorPosition.AFTER : ListAnchorPosition.BEFORE,
      },
    },
  };
}

/**
 * From startIndex check nearby indexes alternating left and right side
 */
function findClosestRemoteNote(startIndex: number, edges: Edge[]) {
  function isRemote(index: number) {
    const edge = edges[index];
    if (!edge) {
      return false;
    }

    return !edge.node.note.localOnly;
  }

  let i = 0;
  let left = startIndex - 1;
  let right = startIndex + 1;
  while (0 <= left && right < edges.length) {
    if (i % 2 == 0) {
      if (isRemote(left)) {
        return left;
      }
      left--;
    } else {
      if (isRemote(right)) {
        return right;
      }
      right++;
    }

    i++;
  }

  while (0 <= left) {
    if (isRemote(left)) {
      return left;
    }
    left--;
  }

  while (right < edges.length) {
    if (isRemote(right)) {
      return right;
    }
    right++;
  }

  return -1;
}
