import { useMediaQuery, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { ColorMode } from '../../__generated__/graphql';
import { useColorMode } from '../../device-preferences/hooks/useColorMode';
import { CreateGlobalStylesFn } from '../../global-styles';
import { CreateThemeOptionsFn } from '../../theme-options';

export interface UseCreateThemeOptions {
  createThemeOptions: CreateThemeOptionsFn;
  createGlobalStyles: CreateGlobalStylesFn;
}

export function useCreateTheme({
  createThemeOptions,
  createGlobalStyles,
}: UseCreateThemeOptions) {
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

  return {
    theme,
    globalStyles,
  };
}
