import { gql } from '@apollo/client';
import { Box, CircularProgress } from '@mui/material';
import { ReactNode } from 'react';

import { EmptySearchInfo } from './EmptySearchInfo';
import { SearchNotesConnectionGrid } from './SearchNotesConnectionGrid';

const _DefaultSearchNotesConnectionGrid_UserFragment = gql(`
  fragment DefaultSearchNotesConnectionGrid_UserFragment on User { 
    id
    search_UserNoteLinkConnection: noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...SearchNotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function DefaultSearchNotesConnectionGrid(props: {
  slots?: {
    emptyElementPrefix?: ReactNode;
    emptyElementSuffix?: ReactNode;
    loadingElementPrefix?: ReactNode;
    loadingElementSuffix?: ReactNode;
  };
  searchText: string | undefined;
}) {
  return (
    <SearchNotesConnectionGrid
      searchText={props.searchText}
      emptyElement={
        <>
          {props.slots?.emptyElementPrefix}
          <EmptySearchInfo
            text={props.searchText === '' ? 'Start typing to search notes' : undefined}
          />
          {props.slots?.emptyElementSuffix}
        </>
      }
      loadingElement={
        <>
          {props.slots?.loadingElementPrefix}
          <Box justifySelf="center">
            <CircularProgress />
          </Box>
          {props.slots?.loadingElementSuffix}
        </>
      }
    />
  );
}
