import { Alert, AlertProps, Snackbar, SnackbarProps } from '@mui/material';
import { ReactNode, createContext, useContext, useState } from 'react';

type SnackbarAlertProps = AlertProps & {
  slotProps?: {
    snackbar: SnackbarProps;
  };
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
    throw new Error(
      'Error: useSnackbarAlert() may be used only in the context of a <SnackbarAlertProvider> component.'
    );
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
    throw new Error(
      'Error: useSnackbarError() may be used only in the context of a <SnackbarAlertProvider> component.'
    );
  }
  return ctx;
}

export default function SnackbarAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [props, setProps] = useState<SnackbarAlertProps>();

  function openSnackbarAlert(props: SnackbarAlertProps) {
    setProps(props);
    setOpen(true);
  }

  function openSnackbarError(message: string) {
    setProps({
      slotProps: {
        snackbar: {
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        },
      },
      severity: 'error',
      children: message,
    });
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <SnackbarAlertContext.Provider value={openSnackbarAlert}>
      <SnackbarErrorContext.Provider value={openSnackbarError}>
        {children}

        <Snackbar
          open={open}
          autoHideDuration={10000}
          onClose={handleClose}
          // eslint-disable-next-line react/prop-types
          {...props?.slotProps?.snackbar}
        >
          <Alert severity="error" onClose={handleClose} {...props} />
        </Snackbar>
      </SnackbarErrorContext.Provider>
    </SnackbarAlertContext.Provider>
  );
}
