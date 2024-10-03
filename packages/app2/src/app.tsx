import { CssBaseline } from '@mui/material';

import { GlobalStyles } from './theme/global-styles';
import { MyThemeProvider } from './theme/context/theme';
import { createThemeOptions } from './theme/theme-options';


export function App() {
  return (
    <MyThemeProvider createThemeOptions={createThemeOptions}>
      <CssBaseline />
      <GlobalStyles />
    </MyThemeProvider>
  );
}
