import { ReactNode } from 'react';
import { useErrorBoundary } from 'react-error-boundary';

import RouteSnackbarAlert from './RouteSnackbarAlert';

export default function RouteSnackbarError({ children }: { children: ReactNode }) {
  const { resetBoundary } = useErrorBoundary();

  function handleClose() {
    resetBoundary();
  }

  return (
    <RouteSnackbarAlert
      slotProps={{
        snackbar: {
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        },
        alert: {
          severity: 'error',
        },
      }}
      onClose={handleClose}
    >
      {children}
    </RouteSnackbarAlert>
  );
}
