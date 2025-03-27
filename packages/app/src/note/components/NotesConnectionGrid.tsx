import { useApolloClient, useQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import {
  forwardRef,
  memo,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { EMPTY_ARRAY } from '../../../../utils/src/array/empty';

import { Logger } from '../../../../utils/src/logging';

import { getFragmentData, gql } from '../../__generated__';
import {
  Note,
  NoteCategory,
  NotesConnectionGridQueryQuery,
} from '../../__generated__/graphql';
import { useDefaultPerPageCount } from '../../device-preferences/hooks/useDefaultPerPageCount';
import { useUserId } from '../../user/context/user-id';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useIsSessionExpired } from '../../user/hooks/useIsSessionExpired';
import { useIsLoading } from '../../utils/context/is-loading';
import { useLogger } from '../../utils/context/logger';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { NoteIdsProvider } from '../context/note-ids';
import { removeNoteFromConnection } from '../models/note-connection/remove';
import { toMovableNoteCategory } from '../utils/note-category';

import { DevClearNotesConnectionCategoryButton } from './DevClearNotesConnectionCategoryButton';
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

interface NextFetchInfo {
  triggerId: string;
  endCursor: string | number;
}

export function NotesConnectionGrid({
  perPageCount,
  infiniteLoadingDelay = 500,
  category = NoteCategory.DEFAULT,
  emptyListElement = null,
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

  const defaultPerPageCount = useDefaultPerPageCount();
  perPageCount = perPageCount ?? defaultPerPageCount;

  const client = useApolloClient();
  const userId = useUserId();
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isParentLoading = useIsLoading();
  const isOnline = useIsOnline();
  const isSessionExpired = useIsSessionExpired();

  const resetFetchMoreRef = useRef({
    userId,
    category,
  });

  const [_renderCounter, setRenderConter] = useState(0);

  const fetchMoreStateRef = useRef<{
    initFetchTriggered: boolean;
    isFetching: boolean;
    next: NextFetchInfo | null;
    intersectedIds: Set<Note['id']>;
    lastTriggerTime: number;
    firstRenderHadNoNotes: boolean | null;
    resetIntersected: (() => void)[];
  }>({
    initFetchTriggered: false,
    isFetching: false,
    next: null,
    intersectedIds: new Set(),
    lastTriggerTime: Date.now(),
    firstRenderHadNoNotes: null,
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
      firstRenderHadNoNotes: null,
      resetIntersected: [],
    };
  }, [logger]);

  // Reset fetchMore when category or userId has changed
  useEffect(() => {
    if (
      resetFetchMoreRef.current.userId === userId &&
      resetFetchMoreRef.current.category === category
    ) {
      return;
    }
    resetFetchMoreRef.current = {
      userId,
      category,
    };

    resetFetchMoreState();
  }, [category, userId, resetFetchMoreState]);

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      category,
    },
    initialFetchPolicy: 'cache-only',
    fetchPolicy: 'cache-only',
    nextFetchPolicy:
      isParentLoading && isOnline && !isSessionExpired ? 'standby' : 'cache-only',
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
          category,
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
  }, [fetchMore, category, perPageCount, infiniteLoadingDelay, logger]);

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
    data?.signedInUser.noteLinkConnection
  );

  const noteIds = useMemo(() => {
    const seenIds = new Set<string>();
    return fragmentData?.edges
      .filter((edge) => {
        const noteLink = edge.node;
        const isInCorrectCategory = noteLink.categoryName == category;
        if (!isInCorrectCategory) {
          logger?.debug('noteLink:removeWrongCategory', {
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
  }, [fragmentData?.edges, category, logger, client]);

  if (fetchMoreStateRef.current.firstRenderHadNoNotes === null) {
    fetchMoreStateRef.current.firstRenderHadNoNotes =
      noteIds == null || noteIds.length == 0;
  }

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
      limit: perPageCount,
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

  const { loadingCount, loadingIds: loadingNoteIds } = getLoadingInfo({
    ids: noteIds,
    isFetching: fetchMoreStateRef.current.isFetching,
    isParentLoading,
    nextFetchInfo: fetchMoreStateRef.current.next,
    perPageCount,
    firstRenderNoIds: fetchMoreStateRef.current.firstRenderHadNoNotes,
  });

  logger?.debug('loading', {
    isParentLoading,
    loadingCount,
    loadingNoteIds,
    isOnline,
    isSessionExpired,
    isLocalOnlyUser,
  });

  const isLoading =
    !isLocalOnlyUser && isOnline ? loadingCount > 0 || loadingNoteIds.length > 0 : false;

  if (!isLoading && noteIds != null && noteIds.length === 0) {
    return emptyListElement;
  }

  const showLoadingCountAndNoteIds = isOnline && !isSessionExpired;

  const isSortableCategory = !!toMovableNoteCategory(category);

  const maybeSortableNotesGrid = (
    <>
      <Suspense>
        <DevClearNotesConnectionCategoryButton
          category={category}
          sx={{
            mb: 2,
            ml: 'auto',
            display: 'block',
            alignSelf: 'center',
          }}
        />
      </Suspense>
      <NotesCardGrid
        loadingCount={showLoadingCountAndNoteIds ? loadingCount : 0}
        loadingNoteIds={showLoadingCountAndNoteIds ? loadingNoteIds : EMPTY_ARRAY}
        noteCard={
          <IntersectOnceNoteCard
            sortable={isSortableCategory}
            onIntersectingOnce={handleIntersectingNoteId}
            provideResetIntersecting={provideResetIntersectingNoteId}
          />
        }
      />
    </>
  );

  const maybeSortableElement = isSortableCategory ? (
    <SortableNotesContext category={category}>
      {maybeSortableNotesGrid}
    </SortableNotesContext>
  ) : (
    maybeSortableNotesGrid
  );

  return (
    <NoteIdsProvider noteIds={noteIds ?? EMPTY_ARRAY}>
      {maybeSortableElement}
    </NoteIdsProvider>
  );
}

function getNextFetchInfo(
  data: NotesConnectionGridQueryQuery | undefined,
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
    data.signedInUser.noteLinkConnection
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

function getLoadingInfo({
  isParentLoading,
  perPageCount,
  isFetching,
  ids,
  nextFetchInfo,
  firstRenderNoIds,
}: {
  isParentLoading: boolean;
  perPageCount: number;
  isFetching: boolean;
  ids: Note['id'][] | undefined;
  nextFetchInfo: NextFetchInfo | null;
  firstRenderNoIds: boolean;
}) {
  if (isFetching && nextFetchInfo != null && ids != null) {
    const triggerIndex = ids.indexOf(nextFetchInfo.triggerId);
    if (triggerIndex >= 0) {
      const startIndex = triggerIndex + 1;
      const endIndex = startIndex + perPageCount;

      return {
        loadingCount: Math.max(0, endIndex - ids.length),
        loadingIds: ids.slice(startIndex, endIndex),
      };
    }
  }

  // Default loading from parent component
  if (isParentLoading) {
    if (!ids || firstRenderNoIds) {
      return {
        loadingCount: perPageCount,
        loadingIds: EMPTY_ARRAY,
      };
    }

    if (ids.length > 0) {
      // If any note is present then don't add loadingCount
      return {
        loadingCount: 0,
        loadingIds: ids.slice(0, perPageCount),
      };
    } else {
      // Initally had no ids and parent filled it, loading by parent is done
      // Loading all in a page
      return {
        loadingCount: perPageCount,
        loadingIds: EMPTY_ARRAY,
      };
    }
  }

  return {
    loadingCount: 0,
    loadingIds: EMPTY_ARRAY,
  };
}

const IntersectOnceNoteCard = memo(
  forwardRef<
    HTMLDivElement,
    {
      sortable: boolean;
      onIntersectingOnce: (noteId: Note['id']) => void;
      provideResetIntersecting: (reset: () => void) => void;
    }
  >(function IntersectOnceNoteCard(
    { sortable, onIntersectingOnce, provideResetIntersecting },
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

    const NoteCardComponent = sortable ? SortableNoteCard : NoteCard;

    return <NoteCardComponent ref={ref} />;
  })
);
