import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import { assertMongoDBIsRunning } from '../utils/src/running-processes';

assertMongoDBIsRunning();

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.integration.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
  },
});
