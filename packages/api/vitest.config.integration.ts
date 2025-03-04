import { defineConfig } from 'vitest/config';

import { assertMongoDBIsRunning } from '../utils/src/running-processes';

assertMongoDBIsRunning();

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  envDir: '../../',
  test: {
    include: ['src/**/*.int.test.ts'],
    setupFiles: [
      'src/__tests__/helpers/load-env.ts',
      'src/__tests__/helpers/setup.integration.ts',
    ],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: true,
    benchmark: {
      include: ['src/**/*.int.bench.ts'],
    },
  },
});
