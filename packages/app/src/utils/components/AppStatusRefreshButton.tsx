import { useQuery } from '@apollo/client';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { useNavigate } from '@tanstack/react-router';
import { forwardRef, useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useFetchedRoutes } from '../../router/context/fetched-routes';
import { useUserId } from '../../user/context/user-id';

import { useIsSessionExpired } from '../../user/hooks/useIsSessionExpired';
import { useAppStatus } from '../hooks/useAppStatus';

import { AppStatusIcon } from './AppStatusIcon';

const AppStatusRefreshButton_Query = gql(`
  query AppStatusRefreshButton_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      localOnly
    }
  }
`);

export const AppStatusRefreshButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, 'disableRipple' | 'onClick' | 'aria-label'>
>(function AppStatusRefreshButton(props, ref) {
  const status = useAppStatus();
  const fetchedRoutes = useFetchedRoutes();
  const isSessionExpired = useIsSessionExpired();

  const statsLink = useStatsLink();
  const navigate = useNavigate();

  const userId = useUserId();
  const { data } = useQuery(AppStatusRefreshButton_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
  });

  const isLocalOnlyUser = data?.signedInUser.localOnly ?? false;

  // Prevent refetching queries from spam click
  const fetcingQueriesRef = useRef(true);

  useEffect(
    () =>
      statsLink.subscribeToOngoingDocumentsCountByType(
        ({ query }) => {
          fetcingQueriesRef.current = query > 0;
        },
        {
          filterUserId: (testUserId) => testUserId == null || testUserId === userId,
        }
      ),
    [statsLink, userId]
  );

  // Local user cannot fetch from server
  if (isLocalOnlyUser) {
    return null;
  }

  function handleClickRefetchQueries() {
    if (fetcingQueriesRef.current) {
      return;
    }

    async function fetch() {
      // Clear fetched routes flag and then refresh the route/page
      fetchedRoutes.clear(userId);
      await navigate({ to: '.', search: (prev) => prev });
    }

    void fetch();
  }

  function tooltipTitle() {
    if (status === 'offline') {
      return 'Offline';
    }

    if (isSessionExpired) {
      return 'Session Expired';
    }

    return 'Refresh';
  }

  return (
    <IconButton
      ref={ref}
      {...props}
      disableRipple={status !== 'refresh'}
      onClick={handleClickRefetchQueries}
      aria-label="app status"
      data-status={status}
    >
      <Tooltip title={tooltipTitle()}>
        <span>
          <AppStatusIcon />
        </span>
      </Tooltip>
    </IconButton>
  );
});
