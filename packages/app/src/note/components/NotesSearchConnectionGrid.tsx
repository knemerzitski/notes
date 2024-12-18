import { useQuery } from '@apollo/client';
import { Alert, Box, css, styled } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { Maybe } from '../../__generated__/graphql';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useIsLoading } from '../../utils/context/is-loading';
import { NoteIdsProvider } from '../context/note-ids';

import { LoadMoreButton } from './LoadMoreButton';
import { NotesCardGrid } from './NotesCardGrid';

const NotesSearchConnectionGrid_UserNoteLinkConnectionFragment = gql(`
  fragment NotesSearchConnectionGrid_UserNoteLinkConnectionFragment on UserNoteLinkConnection {
    edges {
      node {
        id
        note {
          id
        }
        excludeFromConnection @client
        categoryName
        ...NotesCardGrid_UserNoteLinkFragment
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }    
  }
`);

const NotesSearchConnectionGrid_Query = gql(`
  query NotesSearchConnectionGrid_Query($searchText: String!, $first: NonNegativeInt, $after: String) {
    userNoteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...NotesSearchConnectionGrid_UserNoteLinkConnectionFragment
    }  
  }
`);

export function NotesSearchConnectionGrid({
  searchText,
  perPageCount = 20,
  emptyElement = 'empty',
  loadingElement,
}: {
  searchText?: string;
  /**
   * @default 20
   */
  perPageCount?: Maybe<number>;
  /**
   * Element that is rendered when notes list is empty.
   */
  emptyElement?: ReactNode;
  /**
   * Element that is rendered when loading notes.
   */
  loadingElement?: ReactNode;
}) {
  const isLoading = useIsLoading();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data, error, fetchMore } = useQuery(NotesSearchConnectionGrid_Query, {
    variables: {
      first: perPageCount,
      searchText: searchText ?? '',
    },
    fetchPolicy: isLoading ? 'standby' : 'cache-only',
  });

  const fragmentData = getFragmentData(
    NotesSearchConnectionGrid_UserNoteLinkConnectionFragment,
    data?.userNoteLinkSearchConnection
  );

  const noteIds = useMemo(
    () =>
      fragmentData?.edges
        .map((edge) => edge.node)
        .filter((noteLink) => !noteLink.excludeFromConnection)
        .map((edge) => edge.note.id),
    [fragmentData?.edges]
  );

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (!noteIds) {
    return loadingElement ?? <NotesCardGrid />;
  }

  if (noteIds.length === 0 && emptyElement) {
    return emptyElement;
  }

  async function safeFetchMore() {
    if (isFetchingMore) {
      return;
    }

    if (!fragmentData) {
      return;
    }

    const pageInfo = fragmentData.pageInfo;

    setIsFetchingMore(true);
    try {
      await fetchMore({
        // pass this to parent, which in turn will give props for later?
        variables: {
          first: perPageCount,
          after: pageInfo.endCursor,
          searchText,
        },
      });
    } finally {
      setIsFetchingMore(false);
    }
  }

  function handleClickLoadMore() {
    void safeFetchMore();
  }

  const canFetchMore =
    !isLocalOnlyUser &&
    fragmentData?.pageInfo.hasNextPage &&
    fragmentData.pageInfo.endCursor != null;

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <RootBoxStyled>
        <NotesCardGrid />
        {canFetchMore && (
          <LoadMoreButtonStyled isLoading={isFetchingMore} onLoad={handleClickLoadMore} />
        )}
      </RootBoxStyled>
    </NoteIdsProvider>
  );
}

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);

const LoadMoreButtonStyled = styled(LoadMoreButton)(css`
  align-self: center;
`);
