 
import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';

const IsLocalOnlyNote_Query = gql(`
  query IsLocalOnlyNote_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      note {
        id
        localOnly
      }
    }
  }
`);

export function isLocalOnlyNote(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  return (
    cache.readQuery({
      query: IsLocalOnlyNote_Query,
      variables: {
        by,
      },
    })?.userNoteLink.note.localOnly ?? false
  );
}
