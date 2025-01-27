import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { NoteByInput } from '../../../__generated__/graphql';

const IsLocalOnlyNote_Query = gql(`
  query IsLocalOnlyNote_Query($by: NoteByInput!) {
    note(by: $by) {
      id
      localOnly
    }
  }
`);

export function isLocalOnlyNote(
  by: NoteByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  return (
    cache.readQuery({
      query: IsLocalOnlyNote_Query,
      variables: {
        by,
      },
    })?.note.localOnly ?? false
  );
}
