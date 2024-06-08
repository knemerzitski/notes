import { Box, CircularProgress, CssBaseline } from '@mui/material';
import GlobalStyles from './GlobalStyles';
import themeOptions from './themeOptions';
import {
  CustomApolloClient,
  customApolloClientPromise,
} from './modules/apollo-client/apollo-client';
import ApolloClientErrorsSnackbarAlert from './modules/apollo-client/components/ApolloClientErrorsSnackbarAlert';
import ApolloClientSynchronized from './modules/apollo-client/components/ApolloClientSynchronized';
import CustomApolloClientProvider from './modules/apollo-client/context/CustomApolloClientProvider';
import GoogleAuthProvider from './modules/auth/third-party/google/GoogleAuthProvider';
import ActiveCollabTextsManager from './modules/collab/components/ActiveCollabTextsManager';
import SnackbarAlertProvider from './modules/common/components/SnackbarAlertProvider';
import ActiveNotesManager from './modules/note/components/ActiveNotesManager';
import ExternalChangesSubscription from './modules/note/components/ExternalChangesSubscription';
import NoteCreatedSubscription from './modules/note/components/NoteCreatedSubscription';
import NoteDeletedSubscription from './modules/note/components/NoteDeletedSubscription';
import CustomThemeProvider, {
  CustomThemeDirectStorageColorModeProvider,
} from './modules/theme/context/CustomThemeProvider';
import { router } from './modules/routes/RoutesIndex';
import RouterProvider from './modules/router/context/RouterProvider';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import FullSizeErrorContainer from './modules/common/components/FullSizeErrorContainer';
import ConfirmLeaveOngoingMutations from './modules/apollo-client/components/ConfirmLeaveOngoingMutations';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  return (
    <AppLoadApolloClient>
      <ApolloClientSynchronized />
      <ConfirmLeaveOngoingMutations />
      <CustomThemeProvider themeOptions={themeOptions}>
        <SnackbarAlertProvider>
          <CssBaseline />
          <GlobalStyles />
          <Suspense
            fallback={
              <FullSizeErrorContainer message="Unexpected suspense. This should never happen!" />
            }
          >
            <ApolloClientErrorsSnackbarAlert />
            <GoogleAuthProvider clientId={CLIENT_ID}>
              <NoteCreatedSubscription />
              <NoteDeletedSubscription />
              <ExternalChangesSubscription />
              <ActiveNotesManager />
              <ActiveCollabTextsManager />

              <RouterProvider router={router} />
            </GoogleAuthProvider>
          </Suspense>
        </SnackbarAlertProvider>
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
