import { useQuery } from '@apollo/client';
import { Alert, Box, css, styled } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { Maybe, NoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
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
  query NotesConnectionGrid_Query($userBy: UserByInput!, $first: NonNegativeInt, $after: ObjectID, $category: NoteCategory) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(first: $first, after: $after, category: $category) {
        ...NotesConnectionGrid_UserNoteLinkConnectionFragment
      }   
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
  const userId = useUserId();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: perPageCount,
      category,
    },
    fetchPolicy: 'cache-only',
  });

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkConnection
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
    return <NotesCardGrid />;
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
