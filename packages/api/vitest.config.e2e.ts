import { defineConfig } from 'vitest/config';

import {
  assertMongoDBIsRunning,
  assertDynamoDBIsRunning,
} from '../utils/src/running-processes';

assertMongoDBIsRunning();
assertDynamoDBIsRunning();

// Project root directory
const envDir = '../../';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  envDir,
  test: {
    include: ['src/__tests__/e2e/**/*.test.ts'],
    setupFiles: [
      'src/__tests__/helpers/load-env.ts',
      'src/__tests__/helpers/setup.e2e.ts',
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
