import { useQuery } from '@apollo/client';
import { Alert, Box, css, styled } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { Maybe, NoteCategory } from '../../__generated__/graphql';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { NoteIdsProvider } from '../context/note-ids';
import { toMovableNoteCategory } from '../utils/note-category';

import { LoadMoreButton } from './LoadMoreButton';
import { NotesCardGrid } from './NotesCardGrid';
import { SortableNoteCard } from './SortableNoteCard';
import { SortableNotesContext } from './SortableNotesContext';

const NotesConnectionGrid_UserNoteLinkConnectionFragment = gql(`
  fragment NotesConnectionGrid_UserNoteLinkConnectionFragment on UserNoteLinkConnection {
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

const NotesConnectionGrid_Query = gql(`
  query NotesConnectionGrid_Query($first: NonNegativeInt, $after: ObjectID, $category: NoteCategory) {
    userNoteLinkConnection(first: $first, after: $after, category: $category) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }  
  }
`);

export function NotesConnectionGrid({
  perPageCount = 20,
  category = NoteCategory.DEFAULT,
  emptyElement = 'empty',
}: {
  /**
   * @default 20
   */
  perPageCount?: Maybe<number>;
  /**
   * @default Default
   */
  category?: NoteCategory;
  /**
   * Element that is rendered when notes list is empty.
   */
  emptyElement?: ReactNode;
}) {
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      first: perPageCount,
      category,
    },
    fetchPolicy: 'cache-only',
  });

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.userNoteLinkConnection
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
    return <NotesCardGrid noteCard={<SortableNoteCard />} />;
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
        variables: {
          first: perPageCount,
          after: pageInfo.endCursor,
          category,
        },
        // Merge result to existing
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const prevUserNoteLinkConnection = getFragmentData(
            NotesConnectionGrid_UserNoteLinkConnectionFragment,
            previousResult.userNoteLinkConnection
          );

          const moreUserNoteLinkConnection = getFragmentData(
            NotesConnectionGrid_UserNoteLinkConnectionFragment,
            fetchMoreResult.userNoteLinkConnection
          );

          const incomingIds = new Set(
            moreUserNoteLinkConnection.edges.map((edge) => edge.node.id)
          );

          return {
            ...previousResult,
            ...fetchMoreResult,
            userNoteLinkConnection: {
              ...prevUserNoteLinkConnection,
              ...moreUserNoteLinkConnection,
              edges: [
                // Remove any previous duplicates
                ...prevUserNoteLinkConnection.edges.filter(
                  (edge) => !incomingIds.has(edge.node.id)
                ),
                ...moreUserNoteLinkConnection.edges,
              ],
              pageInfo: moreUserNoteLinkConnection.pageInfo,
            },
          };
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

  const isSortableCategory = !!toMovableNoteCategory(category);

  const sortableInnerElement = (
    <RootBoxStyled>
      <NotesCardGrid noteCard={isSortableCategory ? <SortableNoteCard /> : undefined} />
      {canFetchMore && (
        <LoadMoreButtonStyled isLoading={isFetchingMore} onLoad={handleClickLoadMore} />
      )}
    </RootBoxStyled>
  );

  const sortableContextElement = isSortableCategory ? (
    <SortableNotesContext category={category}>
      {sortableInnerElement}
    </SortableNotesContext>
  ) : (
    sortableInnerElement
  );

  return <NoteIdsProvider noteIds={noteIds}>{sortableContextElement}</NoteIdsProvider>;
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
