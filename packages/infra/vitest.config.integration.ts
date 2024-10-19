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
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['lib/**/*.int.test.ts', '__tests__/**/*.int.test.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
  },
});
