import { useState, useRef, useCallback, useEffect } from 'react';

import { useIsLoading } from '../../utils/context/is-loading';
import { useLogger } from '../../utils/context/logger';
import { useIsOnline } from '../../utils/hooks/useIsOnline';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY_LIST: readonly any[] = [];

export function useIntersectingFetchMore<T>({
  ids,
  fetchMore,
  firstFetchMore,
  /**
   * @default 20
   */
  perPageCount = 20,
  /**
   * Wait time beween fetching more notes during infinite scrolling
   * @default 500 milliseconds
   */
  infiniteLoadingDelay = 500,
}: {
  ids: readonly T[] | undefined;
  fetchMore: (args: { perPageCount: number; endCursor: string | number }) => Promise<
    | {
        triggerId: T;
        endCursor: string | number;
      }
    | undefined
  >;
  firstFetchMore: (args: { perPageCount: number }) =>
    | {
        triggerId: T;
        endCursor: string | number;
      }
    | undefined;
  /**
   * @default 20
   */
  perPageCount?: number;
  /**
   * Wait time beween fetching more notes during infinite scrolling
   * @default 500 milliseconds
   */
  infiniteLoadingDelay?: number;
}) {
  const logger = useLogger('useIntersectingFetchMore');

  const isParentLoading = useIsLoading();
  const isOnline = useIsOnline();

  const [isFetching, setIsFetching] = useState(false);

  const fetchMoreStateRef = useRef<{
    intersectedIds: Set<T>;
    isFetching: boolean;
    hasRequestedMore: boolean;
    fetchMore: {
      triggerId: T;
      endCursor: string | number;
    } | null;
    firstTimeTriggered: boolean;
    lastTriggerTime: number;
  }>({
    intersectedIds: new Set(),
    isFetching: false,
    hasRequestedMore: false,
    fetchMore: null,
    firstTimeTriggered: false,
    lastTriggerTime: Date.now(),
  });

  const reset = useCallback(() => {
    logger?.debug('state:reset');

    fetchMoreStateRef.current = {
      intersectedIds: new Set(),
      isFetching: false,
      hasRequestedMore: false,
      fetchMore: null,
      firstTimeTriggered: false,
      lastTriggerTime: Date.now(),
    };
  }, [logger]);

  const safeFetchMore = useCallback(
    async function safeFetchMore() {
      const state = fetchMoreStateRef.current;

      // Have info to fetch
      if (!state.fetchMore) {
        logger?.debug('safeFetchMore:cancel.noFetchMore');
        return;
      }

      // Ensure id has been visible
      if (!state.intersectedIds.has(state.fetchMore.triggerId)) {
        logger?.debug('safeFetchMore:cancel.notIntersected');
        return;
      }

      if (state.isFetching) {
        logger?.debug('safeFetchMore:pending.isRequestingMore');
        state.hasRequestedMore = true;
        return;
      }

      state.isFetching = true;
      setIsFetching(true);

      const delay = Math.max(
        0,
        infiniteLoadingDelay - (Date.now() - state.lastTriggerTime)
      );
      logger?.debug('safeFetchMore:waitDelay', delay);
      await new Promise((res) => {
        setTimeout(() => {
          logger?.debug('safeFetchMore:delayElapsed');
          res(true);
        }, delay);
      });

      logger?.debug('safeFetchMore:triggered', {
        trigger: state.fetchMore.triggerId,
        end: state.fetchMore.endCursor,
      });

      try {
        const fetchMoreResult = await fetchMore({
          perPageCount,
          endCursor: state.fetchMore.endCursor,
        });
        state.lastTriggerTime = Date.now();
        state.fetchMore = null;

        if (!fetchMoreResult) {
          logger?.debug('safeFetchMore:result:empty');
          return;
        }

        state.fetchMore = {
          triggerId: fetchMoreResult.triggerId,
          endCursor: fetchMoreResult.endCursor,
        };

        logger?.debug('safeFetchMore:result:updateFetchMore', state.fetchMore);

        state.hasRequestedMore = true;
      } finally {
        setIsFetching(false);
        state.isFetching = false;

        if (state.hasRequestedMore) {
          state.hasRequestedMore = false;
          void safeFetchMore();
        }
      }
    },
    [fetchMore, perPageCount, infiniteLoadingDelay, logger]
  );

  const handleIntersectingId = useCallback(
    (id: T) => {
      fetchMoreStateRef.current.intersectedIds.add(id);
      logger?.debug('handleIntersectingId', id);
      void safeFetchMore();
    },
    [safeFetchMore, logger]
  );

  // Run fetchMore once after first query
  useEffect(() => {
    // Dont run first fetchMore until parent has finished loading
    if (isParentLoading) {
      logger?.debug('firstTimeFetchMore:parentStillLoading');
      return;
    }

    const state = fetchMoreStateRef.current;

    if (state.firstTimeTriggered) {
      return;
    }

    const firstFetchMoreResult = firstFetchMore({ perPageCount });

    if (!firstFetchMoreResult) {
      logger?.debug('firstFetchMore:result:empty');
      return;
    }

    state.firstTimeTriggered = true;

    state.fetchMore = {
      triggerId: firstFetchMoreResult.triggerId,
      endCursor: firstFetchMoreResult.endCursor,
    };

    logger?.debug('firstFetchMore:updateFetchMore', state.fetchMore);

    void safeFetchMore();
  }, [
    logger,
    firstFetchMore,
    safeFetchMore,
    isParentLoading,
    infiniteLoadingDelay,
    perPageCount,
  ]);

  function calcLoading() {
    const state = fetchMoreStateRef.current;
    if (isFetching && state.fetchMore != null && ids != null) {
      const triggerIndex = ids.indexOf(state.fetchMore.triggerId);
      if (triggerIndex >= 0) {
        const startIndex = triggerIndex + 1;
        const endIndex = startIndex + perPageCount;

        const result = {
          loadingCount: Math.max(0, endIndex - ids.length),
          loadingIds: ids.slice(startIndex, endIndex),
        };

        logger?.debug('calcLoading:fetchMore:advanced', {
          result,
          fetchMore: { ...state.fetchMore },
          ids,
        });

        return result;
      }
    }

    // Default loading from parent
    if (isParentLoading) {
      if (!ids) {
        logger?.debug('calcLoading:fromParent:simple', { perPageCount });

        return {
          loadingCount: perPageCount,
          loadingIds: EMPTY_LIST,
        };
      }

      const startIndex = 0;
      const endIndex = startIndex + perPageCount;

      const result = {
        loadingCount: Math.max(0, endIndex - ids.length),
        loadingIds: ids.slice(startIndex, endIndex),
      };

      logger?.debug('calcLoading:fromParent:advanced', result);

      return result;
    }

    logger?.debug('calcLoading:default');

    return {
      loadingCount: 0,
      loadingIds: EMPTY_LIST,
    };
  }

  const { loadingCount, loadingIds } = calcLoading();

  const isLoading = isOnline ? loadingCount > 0 || loadingIds.length > 0 : false;

  return {
    reset,
    onIntersectingId: handleIntersectingId,
    isLoading,
    loadingCount,
    loadingIds,
  };
}
