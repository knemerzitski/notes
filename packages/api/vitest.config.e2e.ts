import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import {
  assertMongoDBIsRunning,
  assertDynamoDBIsRunning,
} from '../utils/src/running-processes';

assertMongoDBIsRunning();
assertDynamoDBIsRunning();

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: ['TEST_', 'MOCK_', 'VITE_'],
  test: {
    include: ['src/__tests__/e2e/**/*.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.e2e.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
  },
});
