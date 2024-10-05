import { ThemeProvider as MuiThemeProvider } from '@emotion/react';
import { createTheme, CssBaseline, GlobalStyles as MuiGlobalStyles } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { CreateThemeOptionsFn } from '../theme-options';
import { CreateGlobalStylesFn } from '../global-styles';

export function ThemeProvider({
  createThemeOptions,
  createGlobalStyles,
  children,
}: {
  createThemeOptions: CreateThemeOptionsFn;
  createGlobalStyles: CreateGlobalStylesFn;
  children: ReactNode;
}) {
  // TODO theme color mode configurable
  const theme = useMemo(
    () => createTheme(createThemeOptions('dark')),
    [createThemeOptions]
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
