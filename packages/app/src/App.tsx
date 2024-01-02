import { ApolloProvider, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './apollo/__generated__/gql';
import { ColorMode } from './apollo/__generated__/graphql';
import { apolloClient } from './apollo/apollo-client';
import RouterProvider from './router/RouterProvider';
import themeOptions from './themeOptions';

const GET_COLOR_MODE = gql(`
  query Preferences {
    preferences @client {
      colorMode
    }
  }
`);

export default function App() {
  const { data } = useSuspenseQuery(GET_COLOR_MODE, {
    client: apolloClient,
  });

  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const prefersDarkMode =
    data.preferences?.colorMode === ColorMode.Dark ||
    (data.preferences?.colorMode === ColorMode.System && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(() => createTheme(themeOptions(colorMode)), [colorMode]);

  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <RouterProvider />
      </ThemeProvider>
    </ApolloProvider>
  );
}
