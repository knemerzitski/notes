import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';

type Status = 'offline' | 'loading' | 'synchronized' | 'refresh';

export function useAppStatus(options?: {
  /**
   * Time in milliseconds how long until synchronized status is set to refresh
   * @default 1500
   */
  synchronizedDuration?: number;
}): Status {
  const statsLink = useStatsLink();
  const userId = useUserId();
  const ongoingCountRef = useRef(0);

  const [status, setStatus] = useState<Status>('refresh');

  const setStatusRefreshDebounced = useDebouncedCallback(() => {
    setStatus('refresh');
  }, options?.synchronizedDuration ?? 1500);

  // Loading while have ongoing operations
  useEffect(() => {
    const globalEventBus = statsLink.getEventBus();
    const userEventBus = statsLink.getEventBus(userId);

    ongoingCountRef.current = statsLink.getOngoingCount(userId);

    function update() {
      const prevOngoingCount = ongoingCountRef.current;
      ongoingCountRef.current = statsLink.getOngoingCount(userId);

      const ongoingCountHasChanged = prevOngoingCount !== ongoingCountRef.current;
      if (!ongoingCountHasChanged) {
        return;
      }

      setStatus((prev) => {
        if (prev === 'offline') {
          return prev;
        }

        if (ongoingCountRef.current > 0) {
          setStatusRefreshDebounced.cancel();
          return 'loading';
        } else {
          setStatusRefreshDebounced();
          return 'synchronized';
        }
      });
    }

    const globalUnsub = globalEventBus.on('*', update);
    const userUnsub = userEventBus.on('*', update);

    update();

    return () => {
      globalUnsub();
      userUnsub();
    };
  }, [statsLink, userId, setStatusRefreshDebounced]);

  // Online restore original status
  useEffect(() => {
    function isOnline() {
      if (ongoingCountRef.current > 0) {
        setStatusRefreshDebounced.cancel();
        setStatus('loading');
      } else {
        setStatus('synchronized');
        setStatusRefreshDebounced();
      }
    }

    window.addEventListener('online', isOnline);

    return () => {
      window.removeEventListener('online', isOnline);
    };
  }, [setStatusRefreshDebounced]);

  // When offline only show offline status
  useEffect(() => {
    function isOffline() {
      setStatusRefreshDebounced.cancel();
      setStatus('offline');
    }

    window.addEventListener('offline', isOffline);

    return () => {
      window.removeEventListener('offline', isOffline);
    };
  }, [setStatusRefreshDebounced]);

  return status;
}
