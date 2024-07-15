import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { ReactNode, Suspense, useEffect, useState } from 'react';

import GlobalStyles from './GlobalStyles';
import { customApolloClientPromise } from './modules/apollo-client/apollo-client';
import ApolloClientErrorsSnackbarAlert from './modules/apollo-client/components/ApolloClientErrorsSnackbarAlert';
import ApolloClientSynchronized from './modules/apollo-client/components/ApolloClientSynchronized';
import ConfirmLeaveOngoingMutations from './modules/apollo-client/components/ConfirmLeaveOngoingMutations';
import CustomApolloClientProvider from './modules/apollo-client/context/CustomApolloClientProvider';
import { CustomApolloClient } from './modules/apollo-client/custom-apollo-client';
import GoogleAuthProvider from './modules/auth/third-party/google/GoogleAuthProvider';
import ActiveCollabTextsManager from './modules/collab/components/ActiveCollabTextsManager';
import FullSizeErrorContainer from './modules/common/components/FullSizeErrorContainer';
import RenderedFabsTrackingProvider from './modules/common/components/RenderedFabsTrackingProvider';
import SnackbarAlertProvider from './modules/common/components/SnackbarAlertProvider';
import ActiveNotesManager from './modules/note/remote/components/ActiveNotesManager';
import NoteCreatedSubscription from './modules/note/remote/components/NoteCreatedSubscription';
import NoteDeletedSubscription from './modules/note/remote/components/NoteDeletedSubscription';
import NoteUpdatedSubscription from './modules/note/remote/components/NoteUpdatedSubscription';
import RouterProvider from './modules/router/context/RouterProvider';
import { router } from './modules/routes/RoutesIndex';
import CustomThemeProvider, {
  CustomThemeDirectStorageColorModeProvider,
} from './modules/theme/context/CustomThemeProvider';
import themeOptions from './themeOptions';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
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
