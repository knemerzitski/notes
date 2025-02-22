import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import {
  getUserNoteLinkId,
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../../utils/id';

const NodeHiddenInList_Query = gql(`
  query NodeHiddenInList_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        hiddenInList
      }
    }
  }
`);

export function hideNoteInList(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  return cache.writeQuery({
    query: NodeHiddenInList_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
    data: {
      __typename: 'Query',
      signedInUser: {
        __typename: 'User',
        id: userId,
        noteLink: {
          __typename: 'UserNoteLink',
          id: getUserNoteLinkId(noteId, userId),
          hiddenInList: true,
        },
      },
    },
  });
}

export function isNoteHiddenInList(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  const data = cache.readQuery({
    query: NodeHiddenInList_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  return data?.signedInUser.noteLink.hiddenInList ?? false;
}

export function clearNoteHiddenInList(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify'>
) {
  cache.evict({
    fieldName: 'hiddenInList',
    id: cache.identify({
      __typename: 'UserNoteLink',
      id: getUserNoteLinkIdFromByInput(by, cache),
    }),
  });
}
