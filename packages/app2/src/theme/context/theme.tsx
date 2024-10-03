import { ThemeProvider } from '@emotion/react';
import { createTheme } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { CreateThemeOptionsFn } from '../theme-options';

interface MyThemeProviderProps {
  createThemeOptions: CreateThemeOptionsFn;
  children: ReactNode;
}

export function MyThemeProvider({ createThemeOptions, children }: MyThemeProviderProps) {
  // TODO theme color mode configurable
  const theme = useMemo(
    () => createTheme(createThemeOptions('dark')),
    [createThemeOptions]
  );

  return <ThemeProvider theme={theme}> {children}</ThemeProvider>;
}
