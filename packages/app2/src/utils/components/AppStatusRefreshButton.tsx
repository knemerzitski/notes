import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { CrossFade } from './CrossFade';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useAppStatus } from '../hooks/useAppStatus';
import { useEffect, useRef } from 'react';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';
import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useNavigate } from '@tanstack/react-router';
import { useFetchedRoutes } from '../context/fetched-routes';

const AppStatusRefreshButton_Query = gql(`
  query AppStatusRefreshButton_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      localOnly
    }
  }
`);

export function AppStatusRefreshButton() {
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

  const isLocalOnlyUser = data?.signedInUser?.localOnly ?? false;

  // Prevent refetching queries from spam click
  const fetcingQueriesRef = useRef(statsLink.getOngoingQueriesCount(userId) > 0);

  useEffect(() => {
    fetcingQueriesRef.current = statsLink.getOngoingQueriesCount(userId) > 0;
    return statsLink.getUserEventBus(userId).on('*', () => {
      fetcingQueriesRef.current = statsLink.getOngoingQueriesCount(userId) > 0;
    });
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
      await navigate({ to: '.' });
    }

    void fetch();
  }

  return (
    <IconButton
      disableRipple={status !== 'refresh'}
      onClick={handleClickRefetchQueries}
      aria-label={`status ${status}`}
    >
      <Tooltip title="Refresh">
        <span>
          <CrossFade
            elements={[
              {
                in: status === 'offline',
                element: <CloudOffIcon fontSize="inherit" />,
              },
              {
                in: status === 'loading',
                element: <CircularProgress size="1em" />,
              },
              {
                in: status === 'synchronized',
                element: <CloudDoneIcon fontSize="inherit" />,
              },
              {
                in: status === 'refresh',
                element: <RefreshIcon fontSize="inherit" />,
                FadeProps: {
                  appear: false,
                },
              },
            ]}
          />
        </span>
      </Tooltip>
    </IconButton>
  );
}
