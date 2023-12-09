import { exec } from 'child_process';
import { join } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/helpers/setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
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
