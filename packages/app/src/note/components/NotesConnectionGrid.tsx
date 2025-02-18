import { useApolloClient, useQuery } from '@apollo/client';
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
import { useUserId } from '../../user/context/user-id';
import { NoteIdsProvider } from '../context/note-ids';
import { toMovableNoteCategory } from '../utils/note-category';

import { NotesCardGrid } from './NotesCardGrid';
import { SortableNoteCard } from './SortableNoteCard';
import { SortableNotesContext } from './SortableNotesContext';
import { NoteCard } from './NoteCard';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { Maybe } from '~utils/types';
import { useIsLoading } from '../../utils/context/is-loading';
import { useLogger } from '../../utils/context/logger';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import BugReportIcon from '@mui/icons-material/BugReport';

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

// TODO reuse logic in NotesSearchConnection

export function NotesConnectionGrid({
  perPageCount,
  category = NoteCategory.DEFAULT,
  emptyElement = 'empty',
  infiniteLoadingDelay = 500,
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
  /**
   * Wait time beween fetching more notes during infinite scrolling
   * @default 500 milliseconds
   */
  infiniteLoadingDelay?: number;
}) {
  const logger = useLogger('NotesConnectionGrid');

  const isParentLoading = useIsLoading();

  const definedPerPageCount = perPageCount ?? 20;

  const userId = useUserId();

  const fetchMoreStateRef = useRef<{
    intersectedNoteIds: Set<string>;
    isFetching: boolean;
    hasRequestedMore: boolean;
    fetchMore: {
      triggerNoteId: string;
      endCursor: string | number;
    } | null;
  }>({
    intersectedNoteIds: new Set(),
    isFetching: false,
    hasRequestedMore: false,
    fetchMore: null,
  });
  const hasTriggeredFirstTimeFetchMoreRef = useRef(false);

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: definedPerPageCount,
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

  const safeFetchMore = useCallback(
    async function safeFetchMore() {
      const state = fetchMoreStateRef.current;

      // Have info to fetch
      if (!state.fetchMore) {
        logger?.debug('safeFetchMore:cancel.noFetchMore');
        return;
      }

      // Ensure note has been visible
      if (!state.intersectedNoteIds.has(state.fetchMore.triggerNoteId)) {
        logger?.debug('safeFetchMore:cancel.notIntersected');
        return;
      }

      if (state.isFetching) {
        logger?.debug('safeFetchMore:pending.requesting');
        state.hasRequestedMore = true;
        return;
      }

      logger?.debug('safeFetchMore:triggered');

      state.isFetching = true;
      try {
        const { data } = await fetchMore({
          variables: {
            first: definedPerPageCount,
            after: state.fetchMore.endCursor,
            category,
          },
        });
        state.fetchMore = null;

        const fragmentData = getFragmentData(
          NotesConnectionGrid_UserNoteLinkConnectionFragment,
          data.signedInUser.noteLinkConnection
        );

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('safeFetchMore:result:noNextPage');
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('safeFetchMore:result:noEndCursor');
          return;
        }

        const newNoteIds = fragmentData.edges
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('safeFetchMore:result:noLastNoteId');
          return;
        }

        state.fetchMore = {
          triggerNoteId: lastNoteId,
          endCursor: nextEndCursor,
        };
        state.hasRequestedMore = true;
      } finally {
        setTimeout(() => {
          state.isFetching = false;
          if (state.hasRequestedMore) {
            state.hasRequestedMore = false;
            if (state.fetchMore) {
              logger?.debug('safeFetchMore:delayElapsed');
              void safeFetchMore();
            }
          }
        }, infiniteLoadingDelay);
      }
    },
    [category, definedPerPageCount, fetchMore, infiniteLoadingDelay, logger]
  );

  const handleIntersectingOnceNoteId = useCallback(
    (noteId: Note['id']) => {
      fetchMoreStateRef.current.intersectedNoteIds.add(noteId);
      void safeFetchMore();
    },
    [safeFetchMore]
  );

  // Run fetchMore once after first query
  useEffect(() => {
    if (hasTriggeredFirstTimeFetchMoreRef.current) {
      return;
    }

    logger?.debug('firstTimeFetchMore');
    const state = fetchMoreStateRef.current;

    if (!data) {
      logger?.debug('firstTimeFetchMore:noData');
      return;
    }

    const fragmentData = getFragmentData(
      NotesConnectionGrid_UserNoteLinkConnectionFragment,
      data.signedInUser.noteLinkConnection
    );

    const hasNextPage = fragmentData.pageInfo.hasNextPage;
    if (!hasNextPage) {
      logger?.debug('firstTimeFetchMore:noNextPage', { fragmentData });
      return;
    }

    const nextEndCursor = fragmentData.pageInfo.endCursor;
    if (nextEndCursor == null) {
      logger?.debug('firstTimeFetchMore:noEndCursor');
      return;
    }

    // Only include notes limited by definedPerPageCount
    const newNoteIds = fragmentData.edges
      .slice(0, definedPerPageCount)
      .map((edge) => edge.node)
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .map((edge) => edge.note.id);

    const lastNoteId = newNoteIds[newNoteIds.length - 1];
    if (lastNoteId == null) {
      return;
    }

    hasTriggeredFirstTimeFetchMoreRef.current = true;

    state.fetchMore = {
      triggerNoteId: lastNoteId,
      endCursor: nextEndCursor,
    };

    void safeFetchMore();
  }, [data, definedPerPageCount, logger, safeFetchMore]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  function calcLoading() {
    const state = fetchMoreStateRef.current;
    if (state.isFetching) {
      const more = state.fetchMore;
      if (more && noteIds) {
        const triggerIndex = noteIds.indexOf(more.triggerNoteId);
        if (triggerIndex >= 0) {
          const startIndex = triggerIndex + 1;
          const endIndex = startIndex + definedPerPageCount;

          const result = {
            loadingCount: Math.max(0, endIndex - noteIds.length),
            loadingNoteIds: noteIds.slice(startIndex, endIndex),
          };

          logger?.debug('calcLoading:advanced', result);

          return result;
        }
      }
    }

    // Default loading from parent
    if (isParentLoading) {
      logger?.debug('calcLoading:fromParent');
      return {
        loadingCount: definedPerPageCount,
        loadingNoteIds: [],
      };
    }

    logger?.debug('calcLoading:default');

    return {
      loadingCount: 0,
      loadingNoteIds: [],
    };
  }

  const { loadingCount, loadingNoteIds } = calcLoading();

  const isLoadingSomething = loadingCount > 0 || loadingNoteIds.length > 0;

  if (!isLoadingSomething && noteIds != null && noteIds.length === 0 && emptyElement) {
    return emptyElement;
  }

  const isSortableCategory = !!toMovableNoteCategory(category);

  const maybeSortableNotesGrid = (
    <RootBoxStyled>
      <DevClearListButton category={category} />
      <NotesCardGrid
        loadingCount={loadingCount}
        loadingNoteIds={loadingNoteIds}
        noteCard={
          <IntersectOnceNoteCard
            sortable={isSortableCategory}
            onIntersectingOnce={handleIntersectingOnceNoteId}
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
    <NoteIdsProvider noteIds={noteIds ?? []}>{maybeSortableElement}</NoteIdsProvider>
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
