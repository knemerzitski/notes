import { ReactNode } from 'react';
import { createGlobalStyles } from '../global-styles';
import { createThemeOptions } from '../theme-options';
import { ThemeProvider } from './ThemeProvider';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      createOptions={{
        createGlobalStyles,
        createThemeOptions,
      }}
    >
      {children}
    </ThemeProvider>
  );
}
