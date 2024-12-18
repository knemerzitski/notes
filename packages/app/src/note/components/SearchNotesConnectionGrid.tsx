import { gql } from '@apollo/client';
import { Box, CircularProgress } from '@mui/material';
import { ReactNode } from 'react';

import { EmptySearchInfo } from './EmptySearchInfo';
import { NotesSearchConnectionGrid } from './NotesSearchConnectionGrid';

const _SearchNotesConnectionGrid_QueryFragment = gql(`
  fragment SearchNotesConnectionGrid_QueryFragment on Query { 
    search_UserNoteLinkConnection: userNoteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...NotesSearchConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function SearchNotesConnectionGrid(props: {
  slots?: {
    emptyElementPrefix?: ReactNode;
    emptyElementSuffix?: ReactNode;
    loadingElementPrefix?: ReactNode;
    loadingElementSuffix?: ReactNode;
  };
  searchText: string | undefined;
}) {
  return (
    <NotesSearchConnectionGrid
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
