import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Location } from 'react-router-dom';

import { useProxyNavigate } from '../../router/ProxyRoutesProvider';
import usePreviousLocation from '../../router/usePreviousLocation';

export type RouteSnackbarAlertProps = AlertProps & {
  slotProps?: {
    snackbar?: SnackbarProps;
  };
};

/**
 * Displays an alert on a Snackbar that is relevant to current route.
 * Leaving current route closes Snackbar.
 * Closing Snackbar leaves current route.
 */
export const RouteSnackbarAlert = forwardRef<HTMLDivElement, RouteSnackbarAlertProps>(
  function RouteSnackbarAlert(props, ref) {
    const navigate = useProxyNavigate();
    const previousLocation = usePreviousLocation();
    const [open, setOpen] = useState(true);
    const isClosingRef = useRef(false);
    const location = useLocation();
    const initialLocationRef = useRef<Location | null>(location);

    const reset = useCallback(() => {
      isClosingRef.current = false;
      setOpen(true);
    }, []);

    useEffect(() => {
      if (initialLocationRef.current !== location) {
        reset();
      }
    }, [location, reset]);

    function handleClosing() {
      setOpen(false);
      isClosingRef.current = true;
    }

    function handleClosed() {
      if (!isClosingRef.current) return;

      if (previousLocation) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }

    return (
      <Snackbar
        ref={ref}
        open={open}
        autoHideDuration={10000}
        TransitionProps={{
          onExited: handleClosed,
        }}
        onClose={handleClosing}
        {...props.slotProps?.snackbar}
      >
        <Alert severity="error" onClose={handleClosing} {...props} />
      </Snackbar>
    );
  }
);

export default RouteSnackbarAlert;
