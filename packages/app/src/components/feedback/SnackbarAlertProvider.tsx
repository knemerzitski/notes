import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode, createContext, useContext, useState } from 'react';

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

const SnackbarErrorContext = createContext<((message: string) => void) | null>(null);

/**
 * @returns Simplified function to display an error message
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbarError() {
  const ctx = useContext(SnackbarErrorContext);
  if (ctx === null) {
    throw new Error('useSnackbarError() requires context <SnackbarAlertProvider>');
  }
  return ctx;
}

export default function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [propsOnOpen, setPropsOnOpen] = useState<SnackbarAlertProps>();

  function openSnackbarAlert(props: SnackbarAlertProps) {
    setPropsOnOpen(props);
    setOpen(true);
  }

  function openSnackbarError(message: string) {
    setPropsOnOpen({
      snackbarProps: {
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
      },
      severity: 'error',
      children: message,
    });
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  const { snackbarProps, ...restPropsOnOpen } = propsOnOpen ?? {};

  return (
    <SnackbarAlertContext.Provider value={openSnackbarAlert}>
      <SnackbarErrorContext.Provider value={openSnackbarError}>
        {children}

        <Snackbar
          open={open}
          autoHideDuration={10000}
          onClose={handleClose}
          {...snackbarProps}
        >
          <Alert severity="error" onClose={handleClose} {...restPropsOnOpen} />
        </Snackbar>
      </SnackbarErrorContext.Provider>
    </SnackbarAlertContext.Provider>
  );
}
