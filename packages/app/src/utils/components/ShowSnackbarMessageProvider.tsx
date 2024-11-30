import { ReactNode } from '@tanstack/react-router';
import { ShowMessageClosure, ShowMessageProvider } from '../context/show-message';
import { useCallback, useId } from 'react';
import { useShowSnackbarAlert } from '../context/snackbar-alert';

export function ShowSnackbarMessageProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const showSnackbarAlert = useShowSnackbarAlert();

  const handleShowMessage: ShowMessageClosure = useCallback(
    (message, options) => {
      const severity = options?.severity ?? 'info';
      showSnackbarAlert({
        onClose: (reason) => {
          if (severity === 'error' && reason === 'clickaway') {
            return false;
          }
          options?.onDone?.();
          return true;
        },
        SnackbarProps: {
          autoHideDuration: severity === 'error' ? 10000 : 5000,
          anchorOrigin: ['error', 'warning'].includes(severity)
            ? {
                vertical: 'top',
                horizontal: 'center',
              }
            : undefined,
        },
        AlertProps: {
          severity,
          children: message,
        },
        modalOptions: {
          immediate: severity === 'error',
          key: `${id}:${severity}:${message}`,
          onDuplicate: () => {
            options?.onDone?.();
          },
        },
      });

      return;
    },
    [showSnackbarAlert, id]
  );

  return (
    <ShowMessageProvider onMessage={handleShowMessage}> {children}</ShowMessageProvider>
  );
}
