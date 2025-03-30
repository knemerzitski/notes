import { useApolloClient } from '@apollo/client';
import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { gql } from '../../__generated__';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';

const UseAppStatus_Query = gql(`
  query UseAppStatus_Query($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
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

export type AppStatus = 'offline' | 'loading' | 'synchronized' | 'refresh';

export function useAppStatus(options?: {
  /**
   * Time in milliseconds how long until synchronized status is set to refresh
   * @default 1500
   */
  synchronizedDuration?: number;
}): AppStatus {
  const client = useApolloClient();
  const statsLink = useStatsLink();
  const userId = useUserId();
  const ongoingCountRef = useRef(0);
  const userHasUnsavedNotesRef = useRef(false);

  const [status, setStatus] = useState<AppStatus>(
    window.navigator.onLine ? 'refresh' : 'offline'
  );

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
          const haveNoReasonForDebounceSynchronized =
            prevUserHasUnsavedNotes === userHasUnsavedNotesRef.current &&
            prevOngoingCount === ongoingCountRef.current &&
            prev === 'refresh';
          if (haveNoReasonForDebounceSynchronized) {
            prevUserHasUnsavedNotes = userHasUnsavedNotesRef.current;
            prevOngoingCount = ongoingCountRef.current;
            return prev;
          }

          setStatusRefreshDebounced();
          return 'synchronized';
        }
      });
    }

    userHasUnsavedNotesRef.current =
      (client.readQuery({
        query: UseAppStatus_Query,
        variables: {
          userBy: {
            id: userId,
          },
        },
      })?.signedInUser.local.unsavedCollabServices.length ?? 0) > 0;
    let prevUserHasUnsavedNotes = userHasUnsavedNotesRef.current;

    const queryObservable = client.watchQuery({
      query: UseAppStatus_Query,
      variables: {
        userBy: {
          id: userId,
        },
      },
      fetchPolicy: 'cache-only',
    });

    const querySubscription = queryObservable.subscribe({
      next(value) {
        userHasUnsavedNotesRef.current =
          value.data.signedInUser.local.unsavedCollabServices.length > 0;
        updateStatus();
      },
    });

    ongoingCountRef.current = 0;
    let prevOngoingCount = ongoingCountRef.current;

    const statsLinkUnsubscribe = statsLink.subscribeToOngoingDocumentsCountByType(
      ({ query, mutation }) => {
        ongoingCountRef.current = query + mutation;
        updateStatus();
      },
      {
        filterUserId: (testUserId) => testUserId == null || testUserId === userId,
      }
    );

    return () => {
      statsLinkUnsubscribe();
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
