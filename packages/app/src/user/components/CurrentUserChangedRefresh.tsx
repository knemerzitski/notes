import { useApolloClient } from '@apollo/client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Maybe } from '~utils/types';

import { gql } from '../../__generated__';
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
 * - Refresh route to run route loader
 */
export function CurrentUserChangedRefresh() {
  const client = useApolloClient();
  const latestUserIdRef = useRef<Maybe<string>>(getCurrentUserId(client.cache));
  const navigate = useNavigate();

  useEffect(() => {
    function userChanged() {
      void navigate({ to: '.' });
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

        latestUserIdRef.current = user.id;
        userChanged();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, navigate]);

  return null;
}
