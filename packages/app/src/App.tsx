import { ApolloProvider, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './__generated__/gql';
import { ColorMode } from './__generated__/graphql';
import { apolloClient, errorLink, statsLink } from './apollo/apollo-client';
import ApolloClientErrorsSnackbarAlert from './apollo/components/ApolloClientErrorsSnackbarAlert';
import ApolloClientSynchronized from './apollo/components/ApolloClientSynchronized';
import { AddFetchResultErrorHandlerProvider } from './apollo/hooks/useAddFetchResultErrorHandler';
import { StatsLinkProvider } from './apollo/hooks/useStatsLink';
import SnackbarAlertProvider from './components/feedback/SnackbarAlertProvider';
import ClientSyncStatusProvider from './context/ClientSyncStatusProvider';
import ActiveNotesProvider from './note/collab/context/ActiveNotesProvider';
import NotesEditorsProvider from './note/collab/context/NoteEditorsProvider';
import ActiveNotesManager from './note/collab/event-components/ManageActiveNotes';
import RouterProvider from './router/RouterProvider';
import GoogleAuthProvider from './session/auth/google/GoogleAuthProvider';
import themeOptions from './themeOptions';

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
    client: apolloClient,
  });
  const preferencesColorMode = data.preferences?.colorMode ?? ColorMode.System;

  const prefersDarkMode =
    preferencesColorMode === ColorMode.Dark ||
    (preferencesColorMode === ColorMode.System && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(() => createTheme(themeOptions(colorMode)), [colorMode]);

  return (
    <ClientSyncStatusProvider>
      <ApolloProvider client={apolloClient}>
        <StatsLinkProvider statsLink={statsLink}>
          <AddFetchResultErrorHandlerProvider errorLink={errorLink}>
            <ApolloClientSynchronized />
            <ThemeProvider theme={theme}>
              <SnackbarAlertProvider>
                <CssBaseline />
                <GlobalStyles />
                <ApolloClientErrorsSnackbarAlert />
                <GoogleAuthProvider clientId={CLIENT_ID}>
                  {/* TODO everything that can be, move into router */}
                  <ActiveNotesProvider>
                    <NotesEditorsProvider>
                      <ActiveNotesManager />
                      <RouterProvider />
                    </NotesEditorsProvider>
                  </ActiveNotesProvider>
                </GoogleAuthProvider>
              </SnackbarAlertProvider>
            </ThemeProvider>
          </AddFetchResultErrorHandlerProvider>
        </StatsLinkProvider>
      </ApolloProvider>
    </ClientSyncStatusProvider>
  );
}
