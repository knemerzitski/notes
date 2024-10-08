import { ThemeProvider as MuiThemeProvider } from '@emotion/react';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { ReactNode } from 'react';

import { useCreateTheme, UseCreateThemeOptions } from '../hooks/useCreateTheme';

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
      {children}
    </MuiThemeProvider>
  );
}
