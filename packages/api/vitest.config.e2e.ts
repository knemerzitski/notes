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
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: ['TEST_', 'MOCK_', 'VITE_'],
  test: {
    include: ['src/__test__/e2e/**/*.test.ts'],
    setupFiles: ['src/__test__/helpers/setup.e2e.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
  },
});
