import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const HasNoteFragment_NoteFragment = gql(`
  fragment HasNoteFragment_NoteFragment on Note {
    id
  }  
`);

export function hasNoteFragment(
  noteId: string,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'identify'>
) {
  const note = cache.readFragment({
    fragment: HasNoteFragment_NoteFragment,
    id: cache.identify({
      __typename: 'Note',
      id: noteId,
    }),
  });

  return note != null;
}
