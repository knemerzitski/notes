import { useApolloClient } from '@apollo/client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { getCurrentUserId } from '../models/signed-in-user/get-current';
import { User } from '../../__generated__/graphql';

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

  useEffect(() => {
    function userChanged(userId: User['id']) {
      void navigate({
        to: '.',
        search: (prev) => ({
          ...prev,
          // Trigger route loader by inclduing switchUserId
          switchUserId: userId,
        }),
        // Don't display switchUserId
        mask: {
          to: '.',
          search: ({ switchUserId, ...restPrev }) => restPrev,
        },
      });
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
        userChanged(user.id);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, navigate]);

  return null;
}
