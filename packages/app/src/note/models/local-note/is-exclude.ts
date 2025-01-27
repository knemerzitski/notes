import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

const IsExcludeNoteFromConnection_Query = gql(`
  query IsExcludeNoteFromConnection_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
        excludeFromConnection
      }
    }
  }
`);

export function isExcludeNoteFromConnection(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  const data = cache.readQuery({
    query: IsExcludeNoteFromConnection_Query,
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  return data?.signedInUser.noteLink.excludeFromConnection ?? false;
}
