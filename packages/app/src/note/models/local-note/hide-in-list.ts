import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../../utils/id';

const HideNoteInList_Query = gql(`
  query HideNoteInList_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
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
    query: HideNoteInList_Query,
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
