import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { parseUserNoteLinkByInput } from '../../utils/id';

const NoteExists_Query = gql(`
  query NoteExists_Query($userBy: SignedInUserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      noteLink(by: $noteBy) {
        id
      }
    }
  }
`);

export function noteExists(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const { userId, noteId } = parseUserNoteLinkByInput(by, cache);

  return (
    cache.readQuery({
      query: NoteExists_Query,
      variables: {
        userBy: {
          id: userId,
        },
        noteBy: {
          id: noteId,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    })?.signedInUser.noteLink?.id != null
  );
}
