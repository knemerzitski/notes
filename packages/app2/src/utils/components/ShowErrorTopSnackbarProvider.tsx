import { ReactNode } from '@tanstack/react-router';
import { ShowErrorClosure, ShowErrorProvider } from '../context/show-error';
import { useCallback, useId } from 'react';
import { useShowSnackbarAlert } from '../context/snackbar-alert';

export function ShowErrorTopSnackbarProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showSnackbarAlert = useShowSnackbarAlert();

  const handleShowError: ShowErrorClosure = useCallback(
    (errorMsg) => {
      showSnackbarAlert({
        onClose: (reason) => reason !== 'clickaway',
        SnackbarProps: {
          autoHideDuration: 10000,
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'center',
          },
        },
        AlertProps: {
          severity: 'error',
          children: errorMsg,
        },
        modalOptions: {
          immediate: true,
          key: `${id}:${errorMsg}`,
        },
      });

      return;
    },
    [showSnackbarAlert, id]
  );

  return (
    <ShowErrorProvider onErrorMessage={handleShowError}> {children}</ShowErrorProvider>
  );
}
