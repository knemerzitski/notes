import { ApolloProvider, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './__generated__/gql';
import { ColorMode } from './__generated__/graphql';
import themeOptions from './themeOptions';
import { customApolloClient } from './modules/apollo-client/apollo-client';
import ApolloClientErrorsSnackbarAlert from './modules/apollo-client/components/ApolloClientErrorsSnackbarAlert';
import ApolloClientSynchronized from './modules/apollo-client/components/ApolloClientSynchronized';
import CustomApolloClientProvider from './modules/apollo-client/context/CustomApolloClientProvider';
import { AddFetchResultErrorHandlerProvider } from './modules/apollo-client/hooks/useAddFetchResultErrorHandler';
import { StatsLinkProvider } from './modules/apollo-client/hooks/useStatsLink';
import GoogleAuthProvider from './modules/auth/third-party/google/GoogleAuthProvider';
import ActiveCollabTextsManager from './modules/collab/components/ActiveCollabTextsManager';
import SnackbarAlertProvider from './modules/common/components/SnackbarAlertProvider';
import ActiveNotesManager from './modules/note/components/ActiveNotesManager';
import ExternalChangesSubscription from './modules/note/components/ExternalChangesSubscription';
import NoteCreatedSubscription from './modules/note/components/NoteCreatedSubscription';
import NoteDeletedSubscription from './modules/note/components/NoteDeletedSubscription';
import RouterProvider from './modules/router/RouterProvider';
import { PersistProvider } from './modules/apollo-client/hooks/usePersist';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const QUERY = gql(`
  query App {
    preferences @client {
      colorMode
    }
  }
`);

export default function App() {
  // TODO theme preference as separate component in preferences.
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const { data } = useSuspenseQuery(QUERY, {
    client: customApolloClient.client,
  });
  const preferencesColorMode = data.preferences?.colorMode ?? ColorMode.System;

  const prefersDarkMode =
    preferencesColorMode === ColorMode.Dark ||
    (preferencesColorMode === ColorMode.System && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(() => createTheme(themeOptions(colorMode)), [colorMode]);

  return (
    <CustomApolloClientProvider client={customApolloClient}>
      <ApolloProvider client={customApolloClient.client}>
        <PersistProvider persistor={customApolloClient.persistor}>
          <StatsLinkProvider statsLink={customApolloClient.statsLink}>
            <AddFetchResultErrorHandlerProvider errorLink={customApolloClient.errorLink}>
              <ApolloClientSynchronized />
              <ThemeProvider theme={theme}>
                <SnackbarAlertProvider>
                  <CssBaseline />
                  <GlobalStyles />
                  <ApolloClientErrorsSnackbarAlert />
                  <GoogleAuthProvider clientId={CLIENT_ID}>
                    {/* TODO everything that can be, move into router */}
                    <NoteCreatedSubscription />
                    <NoteDeletedSubscription />
                    <ExternalChangesSubscription />
                    <ActiveNotesManager />
                    <ActiveCollabTextsManager />
                    <RouterProvider />
                  </GoogleAuthProvider>
                </SnackbarAlertProvider>
              </ThemeProvider>
            </AddFetchResultErrorHandlerProvider>
          </StatsLinkProvider>
        </PersistProvider>
      </ApolloProvider>
    </CustomApolloClientProvider>
  );
}
