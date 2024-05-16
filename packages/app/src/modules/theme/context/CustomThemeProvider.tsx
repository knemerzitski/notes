import { ReactNode, useMemo } from 'react';
import { gql } from '../../../__generated__/gql';
import { useSuspenseQuery } from '@apollo/client';
import { ThemeProvider } from '@emotion/react';
import { useMediaQuery, createTheme } from '@mui/material';
import { ColorMode } from '../../../__generated__/graphql';
import { customApolloClient } from '../../apollo-client/apollo-client';
import { ThemeOptionsFn } from '../../../themeOptions';

const QUERY = gql(`
  query CustomThemeProvider {
    preferences @client {
      colorMode
    }
  }
`);

interface CustomThemeProviderProps {
  themeOptions: ThemeOptionsFn;
  children: ReactNode;
}

export default function CustomThemeProvider({
  themeOptions,
  children,
}: CustomThemeProviderProps) {
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const { data } = useSuspenseQuery(QUERY, {
    client: customApolloClient.client,
  });
  const preferencesColorMode = data.preferences?.colorMode ?? ColorMode.System;

  const prefersDarkMode =
    preferencesColorMode === ColorMode.Dark ||
    (preferencesColorMode === ColorMode.System && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(
    () => createTheme(themeOptions(colorMode)),
    [colorMode, themeOptions]
  );

  return <ThemeProvider theme={theme}> {children}</ThemeProvider>;
}
