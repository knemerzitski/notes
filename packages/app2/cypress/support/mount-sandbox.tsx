import { Box, Card } from '@mui/material';
import { mount } from 'cypress/react18';
import { ReactNode } from 'react';

import './commands';
import { AppThemeProvider } from '../../src/theme/components/AppThemeProvider';

/**
 * Mount in a experimental sandbox to tinker with components.
 * Uses app theme and mounts the component at the center of the
 * window in Mui Card.
 */
export const mountSandbox: typeof mount = (jsx: ReactNode, ...restArgs) => {
  return mount(
    <AppThemeProvider>
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
    </AppThemeProvider>,
    ...restArgs
  );
};
