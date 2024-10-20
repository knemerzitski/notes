import { useApolloClient } from '@apollo/client';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RefreshIcon from '@mui/icons-material/Refresh';
import { CircularProgress, IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { gql } from '../../../../__generated__/gql';
import { useStatsLink } from '../../../apollo-client/hooks/use-stats-link';
import { CrossFade } from '../../../common/components/cross-fade';

const QUERY = gql(`
  query SyncStatusButton {
    isClientSynchronized @client
  }
`);

enum Status {
  READY_TO_REFRESH = 'refresh',
  LOADING = 'loading',
  SYNCHRONIZED = 'synchronized',
}

interface CloudStateButtonProps extends IconButtonProps {
  /**
   * Size of the component icons.
   * If using a string, you need to provide the CSS unit, e.g. '3rem'.
   * @default 24
   */
  fontSize?: number | string;
  /**
   * How long cloud icon is shown after loading.
   * @default 1500
   */
  cloudDuration?: number;
}

export function SyncStatusButton({
  fontSize = 24,
  cloudDuration = 1500,
  ...restProps
}: CloudStateButtonProps) {
  const client = useApolloClient();

  const statsLink = useStatsLink();

  const cloudIconTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState(Status.READY_TO_REFRESH);

  const statusLoading = useCallback(() => {
    setStatus((status) => {
      if (status !== Status.LOADING) {
        // Stop cloud icon timer
        if (cloudIconTimeoutIdRef.current !== null) {
          clearTimeout(cloudIconTimeoutIdRef.current);
          cloudIconTimeoutIdRef.current = null;
        }
      }

      return Status.LOADING;
    });
  }, []);

  const statusSynchronized = useCallback(() => {
    setStatus((status) => {
      if (status === Status.READY_TO_REFRESH) return status;

      if (status !== Status.SYNCHRONIZED) {
        // Reset cloud icon timer
        if (cloudIconTimeoutIdRef.current !== null) {
          clearTimeout(cloudIconTimeoutIdRef.current);
        }
        cloudIconTimeoutIdRef.current = setTimeout(() => {
          setStatus(Status.READY_TO_REFRESH);
          cloudIconTimeoutIdRef.current = null;
        }, cloudDuration);
      }

      return Status.SYNCHRONIZED;
    });
  }, [cloudDuration]);

  useEffect(() => {
    const observable = client.watchQuery({
      query: QUERY,
      fetchPolicy: 'cache-only',
    });

    const sub = observable.subscribe({
      next(value) {
        const isClientSynchronized = value.data.isClientSynchronized;
        if (isClientSynchronized) {
          statusSynchronized();
        } else {
          statusLoading();
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, statusSynchronized, statusLoading]);

  // Prevent refetching queries from spam click
  const fetcingQueriesRef = useRef(statsLink.ongoing.query > 0);

  async function refetchQueries() {
    if (fetcingQueriesRef.current) return;
    try {
      fetcingQueriesRef.current = true;
      await client.reFetchObservableQueries(false);
    } finally {
      fetcingQueriesRef.current = false;
    }
  }

  const disableRipple = status !== Status.READY_TO_REFRESH;

  return (
    <Tooltip title="Refresh">
      <span>
        <IconButton
          color="inherit"
          aria-label={status}
          onClick={() => {
            void refetchQueries();
          }}
          disableRipple={disableRipple}
          {...restProps}
          sx={{
            fontSize,
            ...restProps.sx,
          }}
        >
          <CrossFade
            size={fontSize}
            unmountOnExit={true}
            elements={[
              {
                in: status === Status.SYNCHRONIZED,
                element: <CloudDoneIcon color="inherit" fontSize="inherit" />,
              },
              {
                in: status === Status.LOADING,
                element: <CircularProgress color="inherit" size={fontSize} />,
              },
              {
                in: status === Status.READY_TO_REFRESH,
                element: <RefreshIcon color="inherit" fontSize="inherit" />,
                fadeProps: {
                  appear: false,
                },
              },
            ]}
          />
        </IconButton>
      </span>
    </Tooltip>
  );
}
