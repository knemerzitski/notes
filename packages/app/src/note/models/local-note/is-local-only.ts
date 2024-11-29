// eslint-disable-next-line no-restricted-imports
import { ApolloCache } from '@apollo/client';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';

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
