import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import useRouteOpen from '../hooks/useRouteOpen';

type SnackbarAlertProps = AlertProps & {
  snackbarProps?: SnackbarProps;
  /**
   * Close alert when user leaves current route
   * @default false
   */
};

const SnackbarRouteAlertContext = createContext<
  ((props: SnackbarAlertProps) => void) | null
>(null);

/**
 *
 * @returns function to display single Snackbar at a time, replacing old one
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRouteSnackbarAlert() {
  const ctx = useContext(SnackbarRouteAlertContext);
  if (ctx === null) {
    throw new Error(
      'useRouteSnackbarAlert() requires context <RouteSnackbarAlertProvider>'
    );
  }
  return ctx;
}

/**
 * @returns Simplified function to display an error message
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRouteSnackbarError() {
  const showAlert = useRouteSnackbarAlert();

  return useCallback(
    (message: string) => {
      showAlert({
        snackbarProps: {
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        },
        severity: 'error',
        children: message,
      });
    },
    [showAlert]
  );
}

export default function RouteSnackbarAlertProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [propsOnOpen, setPropsOnOpen] = useState<SnackbarAlertProps>();
  const { open, setOpen, onClosing, onClosed } = useRouteOpen();

  const { snackbarProps, ...restPropsOnOpen } = propsOnOpen ?? {};

  const openSnackbarAlert = useCallback(
    (props: SnackbarAlertProps) => {
      setPropsOnOpen(props);
      setOpen(true);
    },
    [setOpen]
  );

  function handleClosing() {
    onClosing();
  }

  function handleExited() {
    onClosed();
  }

  return (
    <SnackbarRouteAlertContext.Provider value={openSnackbarAlert}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClosing}
        TransitionProps={{
          onExited: handleExited,
        }}
        {...snackbarProps}
      >
        <Alert severity="error" onClose={handleClosing} {...restPropsOnOpen} />
      </Snackbar>
    </SnackbarRouteAlertContext.Provider>
  );
}
