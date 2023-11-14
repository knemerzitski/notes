import { ReactNode } from 'react';

import RouteSnackbarAlert from './RouteSnackbarAlert';

export default function RouteSnackbarError({ children }: { children: ReactNode }) {
  return (
    <RouteSnackbarAlert
      slotProps={{
        snackbar: {
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
        },
      }}
      severity="error"
    >
      {children}
    </RouteSnackbarAlert>
  );
}
