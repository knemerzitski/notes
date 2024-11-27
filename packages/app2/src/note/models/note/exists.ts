import { ApolloCache } from '@apollo/client';
import { UserNoteLinkByInput } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';

const NoteExists_Query = gql(`
  query NoteExists_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) {
      id
      note {
        id
      }
    }
  }
`);

export function noteExists(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  return (
    cache.readQuery({
      query: NoteExists_Query,
      variables: {
        by,
      },
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    })?.userNoteLink?.note.id != null
  );
}
