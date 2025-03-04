import { MockLink } from '@apollo/client/testing';
import { Box, Card } from '@mui/material';
import { mount } from 'cypress/react18';
import { ReactNode } from 'react';

import './commands';
import { GraphQLServiceProvider } from '../../src/graphql/components/GraphQLServiceProvider';
import { createGraphQLService } from '../../src/graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../src/graphql-service';
import { AppThemeModuleProvider } from '../../src/theme/components/AppThemeModuleProvider';

/**
 * Mount in a experimental sandbox to tinker with components.
 * Uses app theme and mounts the component at the center of the
 * window in Mui Card.
 */
export const mountInTheme: typeof mount = (children: ReactNode, ...restArgs) => {
  const params = createDefaultGraphQLServiceParams();
  const service = createGraphQLService({
    ...params,
    wsUrl: undefined,
    terminatingLink: new MockLink([]),
  });

  return mount(
    <GraphQLServiceProvider service={service}>
      <AppThemeModuleProvider>
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
            {children}
          </Card>
        </Box>
      </AppThemeModuleProvider>
    </GraphQLServiceProvider>,
    ...restArgs
  );
};
