import { gql } from '@apollo/client';

import { SearchNotesConnectionGrid } from './SearchNotesConnectionGrid';

const _DefaultSearchNotesConnectionGrid_UserFragment = gql(`
  fragment DefaultSearchNotesConnectionGrid_UserFragment on User { 
    id
    search_UserNoteLinkConnection: noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function DefaultSearchNotesConnectionGrid(
  props: Parameters<typeof SearchNotesConnectionGrid>[0]
) {
  return <SearchNotesConnectionGrid {...props} />;
}
