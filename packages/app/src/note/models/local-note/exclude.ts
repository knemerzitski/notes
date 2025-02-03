import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../../utils/id';

const ExcludeNoteFromConnection_Query = gql(`
  query ExcludeNoteFromConnection_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        excludeFromConnection
      }
    }
  }
`);

export function excludeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'writeQuery' | 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  return cache.writeQuery({
    query: ExcludeNoteFromConnection_Query,
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
          excludeFromConnection: true,
        },
      },
    },
  });
}
