import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

type SnackbarAlertProps = AlertProps & {
  snackbarProps?: SnackbarProps;
};

const SnackbarAlertContext = createContext<((props: SnackbarAlertProps) => void) | null>(
  null
);

/**
 *
 * @returns function to display single Snackbar at a time, replacing old one
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarAlert() {
  const ctx = useContext(SnackbarAlertContext);
  if (ctx === null) {
    throw new Error('useSnackbarAlert() requires context <SnackbarAlertProvider>');
  }
  return ctx;
}

/**
 * @returns Simplified function to display an error message
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarError() {
  const showAlert = useSnackbarAlert();

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

export default function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [propsOnOpen, setPropsOnOpen] = useState<SnackbarAlertProps>();

  const { snackbarProps, ...restPropsOnOpen } = propsOnOpen ?? {};

  const openSnackbarAlert = useCallback((props: SnackbarAlertProps) => {
    setPropsOnOpen(props);
    setOpen(true);
  }, []);

  function handleClose() {
    setOpen(false);
  }

  return (
    <SnackbarAlertContext.Provider value={openSnackbarAlert}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        {...snackbarProps}
      >
        <Alert severity="error" onClose={handleClose} {...restPropsOnOpen} />
      </Snackbar>
    </SnackbarAlertContext.Provider>
  );
}
