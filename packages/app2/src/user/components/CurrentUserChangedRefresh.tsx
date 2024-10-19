import { useApolloClient } from '@apollo/client';
import { gql } from '../../__generated__';
import { useEffect, useRef } from 'react';
import { getCurrentUserId } from '../models/signed-in-user/get-current';
import { Maybe } from '~utils/types';
import { useWebSocketClient } from '../../graphql/context/websocket-client';

const CurrentUserChangedRefresh_Query = gql(`
    query CurrentUserChangedRefresh_Query {
      currentSignedInUser @client {
        id
      }
    }
`);

/**
 * When current user changes:
 * - Refetch queries
 * - Restart WebSocket
 */
export function CurrentUserChangedRefresh() {
  const client = useApolloClient();
  const wsClient = useWebSocketClient();
  const latestUserIdRef = useRef<Maybe<string>>(getCurrentUserId(client.cache));

  useEffect(() => {
    function userChanged() {
      wsClient?.restart();
      void client.reFetchObservableQueries(true);
    }

    const observable = client.watchQuery({
      query: CurrentUserChangedRefresh_Query,
    });

    const subscription = observable.subscribe({
      next(value) {
        const user = value.data.currentSignedInUser;

        if (latestUserIdRef.current === user.id) {
          return;
        }

        latestUserIdRef.current = user.id;
        userChanged();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, wsClient]);

  return null;
}
