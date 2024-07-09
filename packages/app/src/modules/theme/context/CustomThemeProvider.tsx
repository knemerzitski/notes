import { useSuspenseQuery } from '@apollo/client';
import { ThemeProvider } from '@emotion/react';
import { useMediaQuery, createTheme } from '@mui/material';
import { ReactNode, useMemo } from 'react';

import { gql } from '../../../__generated__/gql';
import { ColorMode } from '../../../__generated__/graphql';
import { ThemeOptionsFn } from '../../../themeOptions';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';
import { getColorModeInStorage } from '../../preferences/hooks/useColorMode';

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
  const customApolloClient = useCustomApolloClient();

  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const { data } = useSuspenseQuery(QUERY, {
    client: customApolloClient.client,
  });

  const preferencesColorMode = data.preferences.colorMode;

  const prefersDarkMode =
    preferencesColorMode === ColorMode.DARK ||
    (preferencesColorMode === ColorMode.SYSTEM && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(
    () => createTheme(themeOptions(colorMode)),
    [colorMode, themeOptions]
  );

  return <ThemeProvider theme={theme}> {children}</ThemeProvider>;
}

/**
 * Provide theme without state being loaded.
 */
export function CustomThemeDirectStorageColorModeProvider({
  themeOptions,
  children,
}: CustomThemeProviderProps) {
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const preferencesColorMode = getColorModeInStorage();

  const prefersDarkMode =
    preferencesColorMode === ColorMode.DARK ||
    (preferencesColorMode === ColorMode.SYSTEM && devicePrefersDarkMode);
  const colorMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(
    () => createTheme(themeOptions(colorMode)),
    [colorMode, themeOptions]
  );

  return <ThemeProvider theme={theme}> {children}</ThemeProvider>;
}
