import { ApolloProvider, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { createContext, useContext, useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './__generated__/gql';
import { ColorMode } from './__generated__/graphql';
import { ExtendendApolloClient, apolloClient } from './apollo/apollo-client';
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

const ExtendedApolloClientContext = createContext<ExtendendApolloClient | null>(null);

export function useExtendedApolloClient() {
  const ctx = useContext(ExtendedApolloClientContext);
  if (ctx === null) {
    throw new Error(
      'useExtendedApolloClient() requires context ExtendedApolloClientContext.Provider'
    );
  }
  return ctx;
}

export default function App() {
  // TODO theme preference as separate component in preferences.
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const { data } = useSuspenseQuery(QUERY, {
    client: apolloClient.client,
  });
  const preferencesColorMode = data.preferences?.colorMode ?? ColorMode.System;

  const prefersDarkMode =
    preferencesColorMode === ColorMode.Dark ||
    (preferencesColorMode === ColorMode.System && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(() => createTheme(themeOptions(colorMode)), [colorMode]);

  return (
    <ExtendedApolloClientContext.Provider value={apolloClient}>
      <ClientSyncStatusProvider>
        <ApolloProvider client={apolloClient.client}>
          <StatsLinkProvider statsLink={apolloClient.statsLink}>
            <AddFetchResultErrorHandlerProvider errorLink={apolloClient.errorLink}>
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
    </ExtendedApolloClientContext.Provider>
  );
}
