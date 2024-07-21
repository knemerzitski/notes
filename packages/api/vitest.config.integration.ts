import { exec } from 'child_process';
import { join } from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['src/__test__/helpers/setup.integration.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    watch: false,
  },
});

// Ensure MongoDB container is running
const mongoDBDockerPath = join(__dirname, '../../docker/mongodb');
exec(`cd ${mongoDBDockerPath} && docker compose ps`, (err, stdout) => {
  if (!err && !stdout.includes('mongod')) {
    console.error(
      `MongoDB container is not running. Integration tests cannot run without it.\n` +
        `Please start MongoDB container with commad 'npm run mongodb:start'`
    );
    process.exit(1);
  }
});
