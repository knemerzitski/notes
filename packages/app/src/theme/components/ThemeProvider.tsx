import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material';
import { ReactNode } from 'react';

import { useCreateTheme, UseCreateThemeOptions } from '../hooks/useCreateTheme';

import { ResponsiveIsMobile } from './ResponsiveIsMobile';

export function ThemeProvider({
  createOptions,
  children,
}: {
  createOptions: UseCreateThemeOptions;
  children: ReactNode;
}) {
  const { theme, globalStyles } = useCreateTheme(createOptions);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      <ResponsiveIsMobile>{children}</ResponsiveIsMobile>
    </MuiThemeProvider>
  );
}
