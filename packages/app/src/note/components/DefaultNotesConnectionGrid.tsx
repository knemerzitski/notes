import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';

import { EmptyNotesIconText } from './EmptyNotesIconText';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _DefaultNotesConnectionGrid_UserFragment = gql(`
  fragment DefaultNotesConnectionGrid_UserFragment on User {
    id
    default_noteLinkConnection: noteLinkConnection(first: $default_first, after: $default_after, category: DEFAULT) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function DefaultNotesConnectionGrid() {
  return (
    <NotesConnectionGrid
      category={NoteCategory.DEFAULT}
      emptyElement={<EmptyNotesIconText />}
    />
  );
}
