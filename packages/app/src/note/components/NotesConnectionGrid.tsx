import { useApolloClient, useQuery } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Alert, Box, Button, css, styled } from '@mui/material';
import {
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { getFragmentData, gql, makeFragmentData } from '../../__generated__';
import { Note, NoteCategory } from '../../__generated__/graphql';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import { useUserId } from '../../user/context/user-id';
import { useLogger } from '../../utils/context/logger';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { NoteIdsProvider } from '../context/note-ids';
import { useIntersectingFetchMore } from '../hooks/useIntersectingFetchMore';
import { removeNoteFromConnection } from '../models/note-connection/remove';
import { toMovableNoteCategory } from '../utils/note-category';

import { NoteCard } from './NoteCard';
import { NotesCardGrid } from './NotesCardGrid';
import { SortableNoteCard } from './SortableNoteCard';
import { SortableNotesContext } from './SortableNotesContext';

export const NotesConnectionGrid_UserNoteLinkConnectionFragment = gql(`
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY_LIST: readonly any[] = [];

export function NotesConnectionGrid({
  fetchMoreOptions,
  category = NoteCategory.DEFAULT,
  emptyListElement = null,
}: {
  fetchMoreOptions?: Pick<
    Parameters<typeof useIntersectingFetchMore>[0],
    'infiniteLoadingDelay' | 'perPageCount'
  >;
  /**
   * @default Default
   */
  category?: NoteCategory;
  /**
   * Element that is rendered when no notes are found
   */
  emptyListElement?: ReactNode;
}) {
  const logger = useLogger('NotesConnectionGrid');

  const client = useApolloClient();
  const userId = useUserId();
  const isOnline = useIsOnline();

  const resetRef = useRef({
    userId,
    category,
  });

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: fetchMoreOptions?.perPageCount ?? 20,
      category,
    },
    fetchPolicy: 'cache-only',
  });

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkConnection
  );

  const noteIds = useMemo(() => {
    const seenIds = new Set<string>();
    return fragmentData?.edges
      .map((edge) => edge.node)
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .filter((noteLink) => {
        const isInCorrectCategory = noteLink.categoryName == category;
        if (!isInCorrectCategory) {
          logger?.debug('noteLink:removeFromWrongConnectionCategory', {
            noteLink,
            category,
          });

          removeNoteFromConnection(
            {
              userNoteLinkId: noteLink.id,
            },
            client.cache,
            category
          );

          return false;
        }
        return true;
      })
      .map((edge) => edge.note.id)
      .filter((noteId) => {
        if (seenIds.has(noteId)) {
          logger?.error('noteLink:filteredDuplicateId', {
            noteId,
          });
          return false;
        }
        return true;
      });
  }, [fragmentData?.edges, category, logger, client]);

  const {
    isLoading,
    loadingCount,
    loadingIds: loadingNoteIds,
    onIntersectingId: onIntersectingNoteId,
    reset,
  } = useIntersectingFetchMore({
    ...fetchMoreOptions,
    ids: noteIds,
    fetchMore: useCallback(
      async ({ perPageCount, endCursor }) => {
        const { data } = await fetchMore({
          variables: {
            first: perPageCount,
            after: endCursor,
            category,
          },
        });

        const fragmentData = getFragmentData(
          NotesConnectionGrid_UserNoteLinkConnectionFragment,
          data.signedInUser.noteLinkConnection
        );

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('fetchMore:noNextPage');
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('fetchMore:noEndCursor');
          return;
        }

        const newNoteIds = fragmentData.edges
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('fetchMore:noLastNoteId');
          return;
        }

        return {
          triggerId: lastNoteId,
          endCursor: nextEndCursor,
        };
      },
      [category, fetchMore, logger]
    ),
    firstFetchMore: useCallback(
      ({ perPageCount }) => {
        if (!fragmentData) {
          logger?.debug('firstFetchMore:noFragmentData');
          return;
        }

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('firstFetchMore:noNextPage', { fragmentData });
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('firstFetchMore:noEndCursor');
          return;
        }

        // Only include notes limited by definedPerPageCount
        const newNoteIds = fragmentData.edges
          .slice(0, perPageCount)
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        logger?.debug('firstTimeFetchMore:result', { newNoteIds, nextEndCursor });

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('firstTimeFetchMore:noLastId');
          return;
        }

        return {
          triggerId: lastNoteId,
          endCursor: nextEndCursor,
        };
      },
      [logger, fragmentData]
    ),
  });

  // Reset fetchMore when category or userId has changed
  useEffect(() => {
    if (resetRef.current.userId === userId && resetRef.current.category === category) {
      return;
    }
    resetRef.current = {
      userId,
      category,
    };

    reset();
  }, [category, userId, reset]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (!isLoading && noteIds != null && noteIds.length === 0) {
    return emptyListElement;
  }

  const isSortableCategory = !!toMovableNoteCategory(category);

  const maybeSortableNotesGrid = (
    <RootBoxStyled>
      <DevClearListButton category={category} />
      <NotesCardGrid
        loadingCount={isOnline ? loadingCount : 0}
        loadingNoteIds={isOnline ? loadingNoteIds : EMPTY_LIST}
        noteCard={
          <IntersectOnceNoteCard
            sortable={isSortableCategory}
            onIntersectingOnce={onIntersectingNoteId}
          />
        }
      />
    </RootBoxStyled>
  );

  const maybeSortableElement = isSortableCategory ? (
    <SortableNotesContext category={category}>
      {maybeSortableNotesGrid}
    </SortableNotesContext>
  ) : (
    maybeSortableNotesGrid
  );

  return (
    <NoteIdsProvider noteIds={noteIds ?? EMPTY_LIST}>
      {maybeSortableElement}
    </NoteIdsProvider>
  );
}

function DevClearListButton(props: Parameters<typeof ClearListButton>[0]) {
  return (
    <IsDevToolsEnabled>
      <ClearListButton {...props} />
    </IsDevToolsEnabled>
  );
}

function ClearListButton({ category }: { category: NoteCategory }) {
  const client = useApolloClient();
  const userId = useUserId();

  function handleClearList() {
    client.cache.writeQuery({
      query: NotesConnectionGrid_Query,
      overwrite: true,
      variables: {
        userBy: {
          id: userId,
        },
        category,
      },
      data: {
        __typename: 'Query',
        signedInUser: {
          __typename: 'User',
          id: userId,
          noteLinkConnection: {
            __typename: 'UserNoteLinkConnection',
            ...makeFragmentData(
              {
                __typename: 'UserNoteLinkConnection',
                edges: [],
                pageInfo: {
                  __typename: 'PageInfo',
                  hasNextPage: false,
                },
              },
              NotesConnectionGrid_UserNoteLinkConnectionFragment
            ),
          },
        },
      },
    });
  }

  return (
    <Button
      color="warning"
      onClick={handleClearList}
      variant="contained"
      size="small"
      sx={{
        alignSelf: 'flex-end',
      }}
    >
      <BugReportIcon fontSize="small" />
      Dev Clear list
    </Button>
  );
}

const IntersectOnceNoteCard = memo(
  forwardRef<
    HTMLDivElement,
    { sortable: boolean; onIntersectingOnce: (noteId: Note['id']) => void }
  >(function IntersectOnceNoteCard({ sortable, onIntersectingOnce }, ref) {
    const noteId = useNoteId();

    ref = useOnIntersecting(
      ref,
      () => {
        onIntersectingOnce(noteId);
      },
      {
        intersectionLimit: 1,
      }
    );

    const NoteCardComponent = sortable ? SortableNoteCard : NoteCard;

    return <NoteCardComponent ref={ref} />;
  })
);

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);
