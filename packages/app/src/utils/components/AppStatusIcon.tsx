import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { CircularProgress } from '@mui/material';

import { useEffect, useRef, useState } from 'react';

import { AppStatus, useAppStatus } from '../hooks/useAppStatus';

import { CrossFade } from './CrossFade';

export function AppStatusIcon({
  visibleStatuses,
  duration,
}: {
  /**
   * @default all
   */
  visibleStatuses?: AppStatus[];
  /**
   * How long is status visible in milliseconds
   * @default infinite
   */
  duration?: number;
}) {
  const status = useAppStatus();

  const prevStatusRef = useRef(status);
  const [isVisible, setIsVisible] = useState(true);

  // Clear hide when status changes
  useEffect(() => {
    if (duration == null) {
      return;
    }

    if (prevStatusRef.current !== status) {
      setIsVisible(true);
    }
    prevStatusRef.current = status;
  }, [duration, status]);

  // Hide after a timeout
  useEffect(() => {
    if (duration == null) {
      return;
    }

    const timeOutId = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => {
      clearTimeout(timeOutId);
    };
  }, [duration, status]);

  function isStatusVisible(targetStatus: AppStatus) {
    if (!isVisible) {
      return false;
    }

    if (status !== targetStatus) {
      return false;
    }

    if (visibleStatuses) {
      return visibleStatuses.includes(targetStatus);
    }

    return true;
  }

  return (
    <CrossFade
      elements={[
        {
          in: isStatusVisible('offline'),
          element: <CloudOffIcon fontSize="inherit" />,
        },
        {
          in: isStatusVisible('loading'),
          element: <CircularProgress size="1em" />,
        },
        {
          in: isStatusVisible('synchronized'),
          element: <CloudDoneIcon fontSize="inherit" />,
        },
        {
          in: isStatusVisible('refresh'),
          element: <RefreshIcon fontSize="inherit" />,
          FadeProps: {
            appear: false,
          },
        },
      ]}
    />
  );
}
