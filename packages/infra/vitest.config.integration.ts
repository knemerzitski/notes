import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import {
  assertMongoDBIsRunning,
  assertDynamoDBIsRunning,
  assertSamApiIsRunning,
} from '../utils/src/running-processes';

assertMongoDBIsRunning();
assertDynamoDBIsRunning();
assertSamApiIsRunning();

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  envDir: '../../',
  test: {
    include: ['lib/**/*.int.test.ts', '__tests__/**/*.int.test.ts'],
    setupFiles: [
      '__tests__/helpers/load-env.ts',
      '__tests__/helpers/setup.integration.ts',
    ],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
  },
});
