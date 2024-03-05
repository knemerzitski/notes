import { ApolloProvider, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './__generated__/gql';
import { ColorMode } from './__generated__/graphql';
import { apolloClient, statsLink } from './apollo/apollo-client';
import ApolloClientSynchronized from './apollo/components/ApolloClientSynchronized';
import { ApolloStatsLinkProvider } from './apollo/hooks/useApolloClientStatsLink';
import { ClientSyncStatusProvider } from './hooks/useIsClientSynchronized';
import RouterProvider from './router/RouterProvider';
import themeOptions from './themeOptions';

const QUERY = gql(`
  query App {
    preferences @client {
      colorMode
    }
  }
`);

export default function App() {
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
        <ApolloStatsLinkProvider statsLink={statsLink}>
          <ApolloClientSynchronized />
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles />
            <RouterProvider />
          </ThemeProvider>
        </ApolloStatsLinkProvider>
      </ApolloProvider>
    </ClientSyncStatusProvider>
  );
}
