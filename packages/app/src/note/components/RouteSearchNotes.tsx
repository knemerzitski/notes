import { gql } from '@apollo/client';

import { useSearch } from '@tanstack/react-router';

import { useDefaultIsSearchOffline } from '../hooks/useDefaultIsSearchOffline';

import { SearchLocalNotes } from './SearchLocalNotes';
import { SearchNotesConnectionGrid } from './SearchNotesConnectionGrid';

const _RouteSearchNotes_UserFragment = gql(`
  fragment RouteSearchNotes_UserFragment on User { 
    id
    search_UserNoteLinkConnection: noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function RouteSearchNotes(
  props: Omit<
    Parameters<typeof SearchNotesConnectionGrid>[0] &
      Parameters<typeof SearchLocalNotes>[0],
    'searchText'
  >
) {
  const defaultIsSearchOffline = useDefaultIsSearchOffline();

  const { isOfflineSearch = defaultIsSearchOffline, searchText } = useSearch({
    from: '/_root_layout/search',
    select(state) {
      return {
        isOfflineSearch: state.offline,
        searchText: state.text,
      };
    },
  });

  if (isOfflineSearch) {
    return <SearchLocalNotes {...props} searchText={searchText} />;
  } else {
    return <SearchNotesConnectionGrid {...props} searchText={searchText} />;
  }
}
