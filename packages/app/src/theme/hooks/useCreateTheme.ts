import { useMediaQuery, createTheme } from '@mui/material';
import { useMemo } from 'react';
import { ColorMode } from '../../__generated__/graphql';
import { useColorMode } from '../../device-preferences/hooks/useColorMode';
import { CreateGlobalStylesFn } from '../../global-styles';
import { MultiThemeOptions } from '../../theme-options';

export interface UseCreateThemeOptions {
  themeOptions: MultiThemeOptions;
  createGlobalStyles: CreateGlobalStylesFn;
}

export function useCreateTheme({
  themeOptions,
  createGlobalStyles,
}: UseCreateThemeOptions) {
  const devicePrefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [colorMode] = useColorMode();

  const prefersDarkMode =
    colorMode === ColorMode.DARK ||
    (colorMode === ColorMode.SYSTEM && devicePrefersDarkMode);

  const paletteMode = prefersDarkMode ? 'dark' : 'light';

  const theme = useMemo(() => {
    const baseTheme = createTheme(themeOptions.base(paletteMode));
    const composedTheme = createTheme(baseTheme, themeOptions.dynamic(baseTheme));

    return composedTheme;
  }, [themeOptions, paletteMode]);

  const globalStyles = useMemo(
    () => createGlobalStyles(theme),
    [createGlobalStyles, theme]
  );

  return {
    theme,
    globalStyles,
  };
}
