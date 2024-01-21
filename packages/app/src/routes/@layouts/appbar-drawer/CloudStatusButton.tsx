import { useApolloClient } from '@apollo/client';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RefreshIcon from '@mui/icons-material/Refresh';
import { CircularProgress, IconButton, IconButtonProps } from '@mui/material';
import { OperationTypeNode } from 'graphql';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApolloClientStatsLink } from '../../../apollo/providers/StatsLinkProvider';
import CrossFade from '../../../components/utils/CrossFade';

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

export default function CloudStatusButton({
  fontSize = 24,
  cloudDuration = 1500,
  ...restProps
}: CloudStateButtonProps) {
  const client = useApolloClient();

  const statsLink = useApolloClientStatsLink();
  const hasOngoingOperation = useCallback(() => {
    return statsLink.ongoing.query > 0 || statsLink.ongoing.mutation > 0;
  }, [statsLink]);

  const cloudIconTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState(
    hasOngoingOperation() ? Status.LOADING : Status.READY_TO_REFRESH
  );

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

  const updateStatus = useCallback(() => {
    if (hasOngoingOperation()) {
      statusLoading();
    } else {
      statusSynchronized();
    }
  }, [hasOngoingOperation, statusLoading, statusSynchronized]);

  // Subscribe to apollo client operation count changes
  useEffect(() => {
    return statsLink.subscribe(({ type }) => {
      if (type === OperationTypeNode.QUERY || type === OperationTypeNode.MUTATION) {
        updateStatus();
      }
    });
  }, [statsLink, updateStatus]);

  // Prevent refetching queries from spam click
  const fetcingQueriesRef = useRef(statsLink.ongoing.query > 0);

  async function refetchQueries() {
    if (fetcingQueriesRef.current) return;
    try {
      fetcingQueriesRef.current = true;
      updateStatus();
      await client.refetchQueries({
        include: 'all',
      });
    } finally {
      fetcingQueriesRef.current = false;
      updateStatus();
    }
  }

  const disableRipple = status !== Status.READY_TO_REFRESH;

  return (
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
            element: <CloudDoneIcon fontSize="inherit" />,
          },
          {
            in: status === Status.LOADING,
            element: <CircularProgress size={fontSize} />,
          },
          {
            in: status === Status.READY_TO_REFRESH,
            element: <RefreshIcon fontSize="inherit" />,
          },
        ]}
      />
    </IconButton>
  );
}
