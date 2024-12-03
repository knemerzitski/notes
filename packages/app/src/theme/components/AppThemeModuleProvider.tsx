import { ReactNode } from 'react';

import { createGlobalStyles } from '../../global-styles';
import { themeOptions } from '../../theme-options';

import { ThemeProvider } from './ThemeProvider';

export function AppThemeModuleProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      createOptions={{
        createGlobalStyles,
        themeOptions,
      }}
    >
      {children}
    </ThemeProvider>
  );
}
