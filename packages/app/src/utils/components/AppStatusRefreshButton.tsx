import { useQuery } from '@apollo/client';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { useNavigate } from '@tanstack/react-router';
import { OperationTypeNode } from 'graphql';
import { forwardRef, useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';

import { useFetchedRoutes } from '../context/fetched-routes';
import { useAppStatus } from '../hooks/useAppStatus';

import { AppStatusIcon } from './AppStatusIcon';

const AppStatusRefreshButton_Query = gql(`
  query AppStatusRefreshButton_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) @client {
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

  const statsLink = useStatsLink();
  const navigate = useNavigate();

  const userId = useUserId();
  const { data } = useQuery(AppStatusRefreshButton_Query, {
    variables: {
      id: userId,
    },
  });

  const isLocalOnlyUser = data?.signedInUser.localOnly ?? false;

  // Prevent refetching queries from spam click
  const fetcingQueriesRef = useRef(getOngoingQueryCount(userId, statsLink) > 0);

  useEffect(() => {
    fetcingQueriesRef.current = getOngoingQueryCount(userId, statsLink) > 0;

    const noUserUnsub = statsLink.getUserEventBus().on('byType', () => {
      fetcingQueriesRef.current = getOngoingQueryCount(userId, statsLink) > 0;
    });
    const userUnsub = statsLink.getUserEventBus(userId).on('byType', () => {
      fetcingQueriesRef.current = getOngoingQueryCount(userId, statsLink) > 0;
    });

    return () => {
      noUserUnsub();
      userUnsub();
    };
  }, [statsLink, userId]);

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
      fetchedRoutes.clear();
      await navigate({ to: '.', search: (prev) => prev });
    }

    void fetch();
  }

  return (
    <IconButton
      ref={ref}
      {...props}
      disableRipple={status !== 'refresh'}
      onClick={handleClickRefetchQueries}
      aria-label={`status ${status}`}
    >
      <Tooltip title={status === 'offline' ? 'Offline' : 'Refresh'}>
        <span>
          <AppStatusIcon />
        </span>
      </Tooltip>
    </IconButton>
  );
});

function getOngoingQueryCount(
  userId: string | undefined,
  statsLink: ReturnType<typeof useStatsLink>
) {
  let count = 0;
  const noUser = statsLink.getUserOngoing(userId);
  count += noUser.byType(OperationTypeNode.QUERY);

  if (userId && userId !== '') {
    const user = statsLink.getUserOngoing(userId);
    count += user.byType(OperationTypeNode.QUERY);
  }

  return count;
}
