import { exec } from 'child_process';
import { join } from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/**/*.int.test.ts', 'src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/helpers/setup.integration.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    benchmark: {
      include: ['src/**/*.bench.int.test.ts', 'src/tests/**/*.bench.test.ts'],
    },
  },
});

// Ensure MongoDB container is running
const mongoDBDockerPath = join(__dirname, '../mocks/mongodb');
exec(`cd ${mongoDBDockerPath} && docker compose ps`, (err, stdout) => {
  if (!err && !stdout.includes('mongodb')) {
    console.error(
      `MongoDB container is not running. Integration tests cannot run without it.\n` +
        `Please start MongoDB container with commad 'npm run mongodb:start'`
    );
    process.exit(-1);
  }
});
