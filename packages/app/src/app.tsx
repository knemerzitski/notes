import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { ReactNode, Suspense, useEffect, useState } from 'react';

import { GlobalStyles } from './global-styles';
import { customApolloClientPromise } from './modules/apollo-client/apollo-client';
import { ApolloClientErrorsSnackbarAlert } from './modules/apollo-client/components/apollo-client-errors-snackbar-alert';
import { ApolloClientSynchronized } from './modules/apollo-client/components/apollo-client-synchronized';
import { ConfirmLeaveOngoingMutations } from './modules/apollo-client/components/confirm-leave-ongoing-mutations';
import { CustomApolloClientProvider } from './modules/apollo-client/context/custom-apollo-client-provider';
import { CustomApolloClient } from './modules/apollo-client/custom-apollo-client';
import { GoogleAuthProvider } from './modules/auth/third-party/google/google-auth-provider';
import { ActiveCollabTextsManager } from './modules/collab/components/active-collab-texts-manager';
import { FullSizeErrorContainer } from './modules/common/components/full-size-error-container';
import { RenderedFabsTrackingProvider } from './modules/common/components/rendered-fabs-tracking-provider';
import { SnackbarAlertProvider } from './modules/common/components/snackbar-alert-provider';
import { ActiveNotesManager } from './modules/note/remote/components/active-notes-manager';
import { NoteCreatedSubscription } from './modules/note/remote/components/note-created-subscription';
import { NoteDeletedSubscription } from './modules/note/remote/components/note-deleted-subscription';
import { NoteUpdatedSubscription } from './modules/note/remote/components/note-updated-subscription';
import { RouterProvider } from './modules/router/context/router-provider';
import { router } from './modules/routes/routes-index';
import {
  CustomThemeDirectStorageColorModeProvider,
  CustomThemeProvider,
} from './modules/theme/context/custom-theme-provider';
import { themeOptions } from './theme-options';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function App() {
  return (
    <AppLoadApolloClient>
      <ApolloClientSynchronized />
      <ConfirmLeaveOngoingMutations />
      <CustomThemeProvider themeOptions={themeOptions}>
        <CssBaseline />
        <GlobalStyles />
        <RenderedFabsTrackingProvider>
          <SnackbarAlertProvider>
            <Suspense
              fallback={
                <FullSizeErrorContainer message="Unexpected suspense. This should never happen!" />
              }
            >
              <ApolloClientErrorsSnackbarAlert />
              <GoogleAuthProvider clientId={CLIENT_ID}>
                <NoteCreatedSubscription />
                <NoteUpdatedSubscription />
                <NoteDeletedSubscription />
                <ActiveNotesManager />
                <ActiveCollabTextsManager />

                <RouterProvider router={router} />
              </GoogleAuthProvider>
            </Suspense>
          </SnackbarAlertProvider>
        </RenderedFabsTrackingProvider>
      </CustomThemeProvider>
    </AppLoadApolloClient>
  );
}

let customApolloClient: CustomApolloClient | null = null;
void customApolloClientPromise.then((client) => {
  customApolloClient = client;
});

/**
 * Display loading until state has been restored from storage
 */
function AppLoadApolloClient({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<CustomApolloClient | null>(customApolloClient);

  useEffect(() => {
    void customApolloClientPromise.then((client) => {
      setClient(client);
    });
  }, []);

  if (client == null) {
    return (
      <>
        <CustomThemeDirectStorageColorModeProvider themeOptions={themeOptions}>
          <CssBaseline />
          <GlobalStyles />
          <PageCenterLoading />
        </CustomThemeDirectStorageColorModeProvider>
      </>
    );
  }

  return (
    <CustomApolloClientProvider client={client}>{children}</CustomApolloClientProvider>
  );
}

function PageCenterLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100dvh',
        flexFlow: 'row wrap',
        gap: 2,
      }}
    >
      Loading saved data
      <CircularProgress size={40} />
    </Box>
  );
}
