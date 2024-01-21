import { Box, Card, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { mount } from 'cypress/react18';
import { ReactNode } from 'react';

import './commands';
import GlobalStyles from '../../src/GlobalStyles';
import themeOptions from '../../src/themeOptions';

/**
 * Mount in a experimental sandbox to tinker with components.
 * Uses app theme and mounts the component at the center of the
 * window in Mui Card.
 */
const mountSandbox: typeof mount = (jsx: ReactNode, ...restArgs) => {
  const theme = createTheme(themeOptions('dark'));

  return mount(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Card
          elevation={3}
          sx={{
            p: 2,
            m: 2,
          }}
        >
          {jsx}
        </Card>
      </Box>
    </ThemeProvider>,
    ...restArgs
  );
};

export default mountSandbox;
