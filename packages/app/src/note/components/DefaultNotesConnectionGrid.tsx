import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { EmptyNotesInfo } from './EmptyNotesInfo';
import { NotesConnectionGrid } from './NotesConnectionGrid';

const _DefaultNotesConnectionGrid_QueryFragment = gql(`
  fragment DefaultNotesConnectionGrid_QueryFragment on Query {
    default_UserNoteLinkConnection: userNoteLinkConnection(first: $default_first, after: $default_after, category: DEFAULT) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }  
  }
`);

export function DefaultNotesConnectionGrid() {
  return (
    <NotesConnectionGrid
      category={NoteCategory.DEFAULT}
      emptyElement={<EmptyNotesInfo />}
    />
  );
}
