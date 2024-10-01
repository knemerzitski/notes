import { CssBaseline } from '@mui/material';

import { GlobalStyles } from './global-styles';
import { CustomThemeProvider } from './theme/context/theme-provider';
import { createThemeOptions } from './theme-options';

export function App() {
  return (
    <CustomThemeProvider createThemeOptions={createThemeOptions}>
      <CssBaseline />
      <GlobalStyles />
    </CustomThemeProvider>
  );
}
