import path from 'node:path';
import { defineConfig } from 'cypress';

import { setupNodeEvents as e2e_setupNodeEvents } from './cypress/support/e2e/setup';
import { loadEnvironmentVariables } from '../utils/src/env';
import vitePreprocessor from 'cypress-vite';

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

    // Output video only when not continous integration (GitHub Actions)
    ...(!process.env.CI && {
      video: true,
      videoCompression: false,
    }),

    ...(process.env.GIF && {
      defaultBrowser: 'chrome',
      specPattern: 'cypress/e2e/gen-demo-gif.cy.ts',
      viewportWidth: 800,
      viewportHeight: 600,
    }),

    setupNodeEvents(on, config) {
      if (process.env.GIF) {
        on('before:browser:launch', (browser, launchOptions) => {
          if (browser.name === 'chrome') {
            launchOptions.args.push('--window-size=1600,1200');
          }
          return launchOptions;
        });
      }

      on('file:preprocessor', vitePreprocessor());

      e2e_setupNodeEvents(on, config);
    },
  },
});
