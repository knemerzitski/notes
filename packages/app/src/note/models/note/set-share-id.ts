import { ApolloCache } from '@apollo/client';
import { Note } from '../../../__generated__/graphql';

export function deleteNoteShareAccess(
  noteId: Note['id'],
  cache: Pick<ApolloCache<unknown>, 'readQuery' | 'evict' | 'identify'>
) {
  cache.evict({
    id: cache.identify({
      __typename: 'Note',
      id: noteId,
    }),
    fieldName: 'shareAccess',
  });
}
