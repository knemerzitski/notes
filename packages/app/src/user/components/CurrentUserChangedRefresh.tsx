import { useApolloClient } from '@apollo/client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { getCurrentUserId } from '../models/signed-in-user/get-current';
import { useStatsLink } from '../../graphql/context/stats-link';
import { OperationTypeNode } from 'graphql';

const CurrentUserChangedRefresh_Query = gql(`
    query CurrentUserChangedRefresh_Query {
      currentSignedInUser @client {
        id
      }
    }
`);

/**
 * When current user changes:
 * - Refresh route to run route loader
 */
export function CurrentUserChangedRefresh() {
  const client = useApolloClient();
  const latestUserIdRef = useRef(getCurrentUserId(client.cache));
  const navigate = useNavigate();

  const statsLink = useStatsLink();

  useEffect(() => {
    function userChanged() {
      void navigate({ to: '.', search: (prev) => prev });
    }

    const observable = client.watchQuery({
      query: CurrentUserChangedRefresh_Query,
      fetchPolicy: 'cache-only',
    });

    const subscription = observable.subscribe({
      next(value) {
        const user = value.data.currentSignedInUser;

        if (latestUserIdRef.current === user.id) {
          return;
        }
        const latestUserId = latestUserIdRef.current;
        latestUserIdRef.current = user.id;

        if (!window.navigator.onLine) {
          // TODO what if onLine changes, most reliable is to listen to gateLink
          userChanged();
        } else {
          const latestUserQueriesCount = statsLink
            .getUserOngoing(latestUserId)
            .byType(OperationTypeNode.QUERY);

          if (latestUserQueriesCount <= 0) {
            userChanged();
          } else {
            // Wait for previous user queries to finish before navigating
            const eventOff = statsLink
              .getUserEventBus(latestUserId)
              .on('byType', ({ ongoingCount, type }) => {
                if (type === OperationTypeNode.QUERY && ongoingCount === 0) {
                  if (latestUserIdRef.current === user.id) {
                    setTimeout(userChanged);
                  }
                  eventOff();
                }
              });
          }
        }
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, navigate, statsLink]);

  return null;
}
