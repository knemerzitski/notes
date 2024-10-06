import { ThemeProvider as MuiThemeProvider } from '@emotion/react';
import {
  createTheme,
  CssBaseline,
  GlobalStyles as MuiGlobalStyles,
  useMediaQuery,
} from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { CreateThemeOptionsFn } from '../theme-options';
import { CreateGlobalStylesFn } from '../global-styles';
import { useColorMode } from '../../device-preferences/hooks/useColorMode';
import { ColorMode } from '../../__generated__/graphql';

export function ThemeProvider({
  createThemeOptions,
  createGlobalStyles,
  children,
}: {
  createThemeOptions: CreateThemeOptionsFn;
  createGlobalStyles: CreateGlobalStylesFn;
  children: ReactNode;
}) {
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [colorMode] = useColorMode();

  const prefersDarkMode =
    colorMode === ColorMode.DARK ||
    (colorMode === ColorMode.SYSTEM && devicePrefersDarkMode);

  const themeMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(
    () => createTheme(createThemeOptions(themeMode)),
    [createThemeOptions, themeMode]
  );

  const globalStyles = useMemo(
    () => createGlobalStyles(theme),
    [createGlobalStyles, theme]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <MuiGlobalStyles styles={globalStyles} />
      {children}
    </MuiThemeProvider>
  );
}
