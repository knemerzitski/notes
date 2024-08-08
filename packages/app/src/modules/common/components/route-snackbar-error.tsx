import { ReactNode } from 'react';
import { useErrorBoundary } from 'react-error-boundary';

import { RouteSnackbarAlert } from './route-snackbar-alert';

export function RouteSnackbarError({ children }: { children: ReactNode }) {
  const { resetBoundary } = useErrorBoundary();

  function handleClose() {
    resetBoundary();
  }

  return (
    <RouteSnackbarAlert
      snackBarProps={{
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
      }}
      alertProps={{
        severity: 'error',
      }}
      onClose={handleClose}
    >
      {children}
    </RouteSnackbarAlert>
  );
}
