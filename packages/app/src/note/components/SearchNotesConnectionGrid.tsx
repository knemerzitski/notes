import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, css, styled } from '@mui/material';
import {
  ComponentType,
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getFragmentData, gql } from '../../__generated__';
import { Note, SearchNotesConnectionGridQueryQuery } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { PassChildren } from '../../utils/components/PassChildren';
import { useIsLoading } from '../../utils/context/is-loading';
import { useLogger } from '../../utils/context/logger';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { NoteIdsProvider } from '../context/note-ids';

import { NoteCard } from './NoteCard';
import { NotesCardGrid } from './NotesCardGrid';

import { NotesConnectionGrid_UserNoteLinkConnectionFragment } from './NotesConnectionGrid';
import { SearchResultIconText } from './SearchResultIconText';
import { Logger } from '~utils/logging';
import { DevClearNotesSearchButton } from './DevClearNotesSearchButton';

const SearchNotesConnectionGrid_Query = gql(`
  query SearchNotesConnectionGrid_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
    signedInUser(by: $userBy) {
      id
      noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
        ...NotesConnectionGrid_UserNoteLinkConnectionFragment
      }
    }
  }
`);

interface NextFetchInfo {
  triggerId: string;
  endCursor: string | number;
}

export function SearchNotesConnectionGrid({
  perPageCount = 20,
  infiniteLoadingDelay = 500,
  searchText,
  NoListComponent = PassChildren,
}: {
  /**
   * @default 20
   */
  perPageCount?: number;
  /**
   * Wait time beween fetching more notes during infinite scrolling
   * @default 500 milliseconds
   */
  infiniteLoadingDelay?: number;
  searchText?: string;
  /**
   * Component that is used when not rendering search result
   */
  NoListComponent?: ComponentType<{ children: ReactNode }>;
}) {
  const logger = useLogger('SearchNotesConnectionGrid');

  const userId = useUserId();
  const isParentLoading = useIsLoading();

  const resetFetchMoreRef = useRef({
    userId,
    searchText,
  });

  const [_renderCounter, setRenderConter] = useState(0);

  const fetchMoreStateRef = useRef<{
    initFetchTriggered: boolean;
    isFetching: boolean;
    next: NextFetchInfo | null;
    intersectedIds: Set<Note['id']>;
    lastTriggerTime: number;
    resetIntersected: (() => void)[];
  }>({
    initFetchTriggered: false,
    isFetching: false,
    next: null,
    intersectedIds: new Set(),
    lastTriggerTime: Date.now(),
    resetIntersected: [],
  });

  const resetFetchMoreState = useCallback(() => {
    logger?.debug('resetFetchMoreState');

    fetchMoreStateRef.current.resetIntersected.forEach((resetIntersectObserver) => {
      resetIntersectObserver();
    });

    fetchMoreStateRef.current = {
      intersectedIds: new Set(),
      isFetching: false,
      next: null,
      initFetchTriggered: false,
      lastTriggerTime: Date.now(),
      resetIntersected: [],
    };
  }, [logger]);

  // Reset fetchMore when searchText or userId has changed
  useEffect(() => {
    if (
      resetFetchMoreRef.current.userId === userId &&
      resetFetchMoreRef.current.searchText === searchText
    ) {
      return;
    }
    resetFetchMoreRef.current = {
      userId,
      searchText,
    };

    resetFetchMoreState();
  }, [searchText, userId, resetFetchMoreState]);

  const { data, error, fetchMore } = useQuery(SearchNotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      searchText: searchText ?? '',
    },
    fetchPolicy: isParentLoading ? 'standby' : 'cache-only',
  });

  const delayedFetchMore = useCallback(async () => {
    const fetchState = fetchMoreStateRef.current;

    // Have info to fetch
    if (!fetchState.next) {
      logger?.debug('delayedFetchMore.noNext');
      return;
    }

    // Ensure id has been visible
    if (!fetchState.intersectedIds.has(fetchState.next.triggerId)) {
      logger?.debug('delayedFetchMore.notIntersected', fetchState.next.triggerId);
      return;
    }

    if (fetchState.isFetching) {
      logger?.debug('delayedFetchMore.alreadyFetching');
      return;
    }

    fetchState.isFetching = true;
    setRenderConter((prev) => prev + 1);

    const delay = Math.max(
      0,
      infiniteLoadingDelay - (Date.now() - fetchState.lastTriggerTime)
    );
    logger?.debug('delayedFetchMore:waitDelay', delay);
    await new Promise((res) => {
      setTimeout(() => {
        logger?.debug('delayedFetchMore:delayElapsed');
        res(true);
      }, delay);
    });
    // Hook might be unmounted at this point

    logger?.debug('delayedFetchMore:triggered', fetchState.next);

    try {
      const { data } = await fetchMore({
        variables: {
          first: perPageCount,
          after: fetchState.next.endCursor,
          searchText,
        },
      });

      fetchState.lastTriggerTime = Date.now();
      fetchState.next = null;

      const next = getNextFetchInfo(data, { logger });
      if (!next) {
        return;
      }
      fetchState.next = next;
    } finally {
      setRenderConter((prev) => prev + 1);
      fetchState.isFetching = false;
      void delayedFetchMore();
    }
  }, [fetchMore, searchText, perPageCount, infiniteLoadingDelay, logger]);

  const handleIntersectingNoteId = useCallback(
    (id: Note['id']) => {
      fetchMoreStateRef.current.intersectedIds.add(id);
      void delayedFetchMore();
    },
    [delayedFetchMore]
  );

  const provideResetIntersectingNoteId = useCallback((reset: () => void) => {
    fetchMoreStateRef.current.resetIntersected.push(reset);
  }, []);

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkSearchConnection
  );

  const noteIds = useMemo(() => {
    const seenIds = new Set<string>();
    return fragmentData?.edges
      .map((edge) => edge.node.note.id)
      .filter((noteId) => {
        if (seenIds.has(noteId)) {
          logger?.error('noteLink:filteredDuplicateId', {
            noteId,
          });
          return false;
        }
        seenIds.add(noteId);
        return true;
      });
  }, [fragmentData?.edges, logger]);

  (function initialFetchMore() {
    const fetchState = fetchMoreStateRef.current;
    if (fetchState.initFetchTriggered) {
      return;
    }

    // Dont run first fetchMore until parent has finished loading
    if (isParentLoading) {
      logger?.debug('initialFetchMore:parentLoading');
      return;
    }

    const next = getNextFetchInfo(data, {
      logger,
    });

    if (!next) {
      logger?.debug('initialFetchMore:noData');
      return;
    }

    logger?.debug('initialFetchMore:hasData');

    fetchState.next = next;
    fetchState.initFetchTriggered = true;
    void delayedFetchMore();
  })();

  logger?.debug('state', {
    data,
    noteIds,
    fetch: { ...fetchMoreStateRef.current },
  });

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  const loadingCount = getLoadingCount({
    ids: noteIds,
    isFetching: fetchMoreStateRef.current.isFetching,
    isParentLoading,
    nextFetchInfo: fetchMoreStateRef.current.next,
    perPageCount,
  });

  if (searchText == null || searchText === '') {
    logger?.debug('startTyping');
    // TODO reuse component
    return (
      <NoListComponent>
        <SearchResultIconText text="Start typing to search notes" />
      </NoListComponent>
    );
  }

  if (isParentLoading) {
    logger?.debug('parentLoading');
    // TODO reuse component
    return (
      <NoListComponent>
        <CenterCircularProgress />
      </NoListComponent>
    );
  }

  if (!noteIds || noteIds.length === 0) {
    logger?.debug('noMatch');
    // TODO reuse component
    return (
      <NoListComponent>
        <SearchResultIconText text={'No matching notes'} />
      </NoListComponent>
    );
  }

  return (
    <NoteIdsProvider noteIds={noteIds}>
      {/* TODO keep stying outside this component */}
      <RootBoxStyled>
        <DevClearNotesSearchButton searchText={searchText} />
        <NotesCardGrid
          loadingCount={loadingCount}
          noteCard={
            <IntersectOnceNoteCard
              onIntersectingOnce={handleIntersectingNoteId}
              provideResetIntersecting={provideResetIntersectingNoteId}
            />
          }
        />
      </RootBoxStyled>
    </NoteIdsProvider>
  );
}

function getNextFetchInfo(
  data: SearchNotesConnectionGridQueryQuery | undefined,
  options?: {
    logger?: Logger | null;
    limit?: number;
  }
) {
  const logger = options?.logger;

  if (!data) {
    logger?.debug('getNextFetchInfo:noData');
    return;
  }

  const noteLinkConnection = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data.signedInUser.noteLinkSearchConnection
  );

  const hasNextPage = noteLinkConnection.pageInfo.hasNextPage;
  if (!hasNextPage) {
    logger?.debug('getNextFetchInfo:noNextPage', { fragmentData: noteLinkConnection });
    return;
  }

  const nextEndCursor = noteLinkConnection.pageInfo.endCursor;
  if (nextEndCursor == null) {
    logger?.debug('getNextFetchInfo:noEndCursor');
    return;
  }

  const limit = options?.limit ?? noteLinkConnection.edges.length;

  // Only include notes limited by perPageCount
  const newNoteIds = noteLinkConnection.edges
    .slice(0, limit)
    .map((edge) => edge.node.note.id);
  const lastNoteId = newNoteIds[newNoteIds.length - 1];
  if (lastNoteId == null) {
    logger?.debug('getNextFetchInfo:noNotes');
    return;
  }

  const result: NextFetchInfo = {
    triggerId: lastNoteId,
    endCursor: nextEndCursor,
  };

  logger?.debug('getNextFetchInfo:result', result);

  return result;
}

function getLoadingCount({
  isParentLoading,
  perPageCount,
  isFetching,
  ids,
  nextFetchInfo,
}: {
  isParentLoading: boolean;
  perPageCount: number;
  isFetching: boolean;
  ids: Note['id'][] | undefined;
  nextFetchInfo: NextFetchInfo | null;
}) {
  if (isFetching && nextFetchInfo != null && ids != null) {
    const triggerIndex = ids.indexOf(nextFetchInfo.triggerId);
    if (triggerIndex >= 0) {
      const startIndex = triggerIndex + 1;
      const endIndex = startIndex + perPageCount;

      return Math.max(0, endIndex - ids.length);
    }
  }

  // Default loading from parent component
  if (isParentLoading) {
    if (!ids) {
      return perPageCount;
    }

    // Loading all in a page
    return Math.max(0, perPageCount - ids.length);
  }

  return 0;
}

const IntersectOnceNoteCard = memo(
  forwardRef<
    HTMLDivElement,
    {
      onIntersectingOnce: (noteId: Note['id']) => void;
      provideResetIntersecting: (reset: () => void) => void;
    }
  >(function IntersectOnceNoteCard(
    { onIntersectingOnce, provideResetIntersecting },
    ref
  ) {
    const noteId = useNoteId();

    ref = useOnIntersecting(
      ref,
      () => {
        onIntersectingOnce(noteId);
      },
      {
        intersectionLimit: 1,
        provideReset: provideResetIntersecting,
      }
    );

    return <NoteCard ref={ref} />;
  })
);

function CenterCircularProgress() {
  return (
    <BoxCenter>
      <CircularProgress />
    </BoxCenter>
  );
}

const BoxCenter = styled(Box)(css`
  justify-self: center;
`);

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);
