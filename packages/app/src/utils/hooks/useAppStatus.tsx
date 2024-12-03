import { useApolloClient } from '@apollo/client';
import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { gql } from '../../__generated__';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';

const UseAppStatus_Query = gql(`
  query UseAppStatus_Query {
    currentSignedInUser @client {
      id
      local {
        id
        unsavedCollabServices {
          id
        }
      }
    }
  }
`);

type Status = 'offline' | 'loading' | 'synchronized' | 'refresh';

export function useAppStatus(options?: {
  /**
   * Time in milliseconds how long until synchronized status is set to refresh
   * @default 1500
   */
  synchronizedDuration?: number;
}): Status {
  const client = useApolloClient();
  const statsLink = useStatsLink();
  const userId = useUserId();
  const ongoingCountRef = useRef(0);
  const userHasUnsavedNotesRef = useRef(false);

  const [status, setStatus] = useState<Status>('refresh');

  const setStatusRefreshDebounced = useDebouncedCallback(() => {
    setStatus('refresh');
  }, options?.synchronizedDuration ?? 1500);

  // Loading while have ongoing operations or user has unsaved notes
  useEffect(() => {
    function updateStatus() {
      setStatus((prev) => {
        if (prev === 'offline') {
          return prev;
        }

        if (ongoingCountRef.current > 0 || userHasUnsavedNotesRef.current) {
          setStatusRefreshDebounced.cancel();
          return 'loading';
        } else {
          setStatusRefreshDebounced();
          return 'synchronized';
        }
      });
    }

    const noUserEventBus = statsLink.getUserEventBus();
    const userEventBus = statsLink.getUserEventBus(userId);

    userHasUnsavedNotesRef.current =
      (client.readQuery({
        query: UseAppStatus_Query,
      })?.currentSignedInUser.local.unsavedCollabServices.length ?? 0) > 0;

    const queryObservable = client.watchQuery({
      query: UseAppStatus_Query,
    });

    const querySubscription = queryObservable.subscribe({
      next(value) {
        userHasUnsavedNotesRef.current =
          value.data.currentSignedInUser.local.unsavedCollabServices.length > 0;
        updateStatus();
      },
    });

    ongoingCountRef.current = statsLink.getOngoingCount(userId);

    const noUserUnsub = noUserEventBus.on('*', () => {
      ongoingCountRef.current = statsLink.getOngoingCount(userId);
      updateStatus();
    });
    const userUnsub = userEventBus.on('*', () => {
      ongoingCountRef.current = statsLink.getOngoingCount(userId);
      updateStatus();
    });

    return () => {
      noUserUnsub();
      userUnsub();
      querySubscription.unsubscribe();
    };
  }, [statsLink, userId, setStatusRefreshDebounced, client]);

  // Online restore original status
  useEffect(() => {
    function isOnline() {
      if (ongoingCountRef.current > 0 || userHasUnsavedNotesRef.current) {
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
