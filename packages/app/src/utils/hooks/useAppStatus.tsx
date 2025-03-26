import { useApolloClient } from '@apollo/client';
import { OperationTypeNode } from 'graphql';
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

    const noUserEventBus = statsLink.getUserEventBus();
    const userEventBus = statsLink.getUserEventBus(userId);

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

    ongoingCountRef.current = getOngoingQueryAndMutationCount(userId, statsLink);
    let prevOngoingCount = ongoingCountRef.current;

    const noUserUnsub = noUserEventBus.on('byType', () => {
      ongoingCountRef.current = getOngoingQueryAndMutationCount(userId, statsLink);
      updateStatus();
    });
    const userUnsub = userEventBus.on('byType', () => {
      ongoingCountRef.current = getOngoingQueryAndMutationCount(userId, statsLink);
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

function getOngoingQueryAndMutationCount(
  userId: string | undefined,
  statsLink: ReturnType<typeof useStatsLink>
) {
  let count = 0;
  const noUser = statsLink.getUserOngoing(userId);
  count +=
    noUser.byType(OperationTypeNode.QUERY) + noUser.byType(OperationTypeNode.MUTATION);

  if (userId && userId !== '') {
    const user = statsLink.getUserOngoing(userId);
    count +=
      user.byType(OperationTypeNode.QUERY) + user.byType(OperationTypeNode.MUTATION);
  }

  return count;
}
