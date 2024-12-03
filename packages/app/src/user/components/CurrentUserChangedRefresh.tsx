import { useApolloClient } from '@apollo/client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Maybe } from '~utils/types';

import { gql } from '../../__generated__';
import { useWebSocketClient } from '../../graphql/context/websocket-client';
import { getCurrentUserId } from '../models/signed-in-user/get-current';




const CurrentUserChangedRefresh_Query = gql(`
    query CurrentUserChangedRefresh_Query {
      currentSignedInUser @client {
        id
      }
    }
`);

/**
 * When current user changes:
 * - Restart WebSocket
 * - Refresh route to run loader
 */
export function CurrentUserChangedRefresh() {
  const client = useApolloClient();
  const wsClient = useWebSocketClient();
  const latestUserIdRef = useRef<Maybe<string>>(getCurrentUserId(client.cache));
  const navigate = useNavigate();

  useEffect(() => {
    function userChanged() {
      wsClient?.restart();
      void navigate({ to: '.' });
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
  }, [client, wsClient, navigate]);

  return null;
}
