import { defineConfig } from 'cypress';

import { setupNodeEvents as e2e_setupNodeEvents } from './cypress/support/e2e/setup';
import { loadEnvironmentVariables } from '../utils/src/env';

loadEnvironmentVariables();

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  component: {
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
  e2e: {
    baseUrl: `http://localhost:${process.env.VITE_APP_PORT ?? 6173}`,
    env: {
      API_URL: process.env.VITE_GRAPHQL_HTTP_URL,
      WS_URL: process.env.VITE_GRAPHQL_WS_URL!,
      DB_URI: process.env.MONGODB_URI,
    },
    setupNodeEvents(on, config) {
      e2e_setupNodeEvents(on, config);
    },
  },
});
