import { ApolloProvider, useMutation, useSuspenseQuery } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { createContext, useCallback, useContext, useMemo } from 'react';

import GlobalStyles from './GlobalStyles';
import { gql } from './__generated__';
import { ColorMode } from './__generated__/graphql';
import apolloClient from './graphql/apolloClient';
import RouterProvider from './router/RouterProvider';
import themeOptions from './themeOptions';

const ColorModeContext = createContext({
  toggleColorMode: async () => {
    return Promise.resolve();
  },
});

// eslint-disable-next-line react-refresh/only-export-components
export function useColorMode() {
  return useContext(ColorModeContext);
}

const GET_PREFERENCES = gql(`
  query Preferences {
    preferences @client {
      colorMode
    }
  }
`);

const UPDATE_COLOR_MODE = gql(`
  mutation UpdateColorMode($colorMode: ColorMode!) {
    updateColorMode(colorMode: $colorMode) @client
  }
`);

export default function App() {
  const { data } = useSuspenseQuery(GET_PREFERENCES, {
    client: apolloClient,
  });

  const [updateColorMode] = useMutation(UPDATE_COLOR_MODE, {
    client: apolloClient,
  });

  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const prefersDarkMode = data.preferences?.colorMode
    ? data.preferences.colorMode === ColorMode.Dark
    : devicePrefersDarkMode;

  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const toggleColorMode = useCallback(async () => {
    const newColorMode = prefersDarkMode ? ColorMode.Light : ColorMode.Dark;
    await updateColorMode({
      variables: {
        colorMode: newColorMode,
      },
      optimisticResponse: {
        updateColorMode: true,
      },
      update(cache, { data }) {
        if (!data?.updateColorMode) return;

        cache.updateQuery(
          {
            query: GET_PREFERENCES,
          },
          (cacheData) => {
            if (!cacheData) return;
            return {
              preferences: {
                ...cacheData.preferences,
                colorMode: newColorMode,
              },
            };
          }
        );
      },
    });
  }, [prefersDarkMode, updateColorMode]);

  const theme = useMemo(() => createTheme(themeOptions(colorMode)), [colorMode]);

  return (
    <ApolloProvider client={apolloClient}>
      <ColorModeContext.Provider value={{ toggleColorMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles />
          <RouterProvider />
        </ThemeProvider>
      </ColorModeContext.Provider>
    </ApolloProvider>
  );
}
