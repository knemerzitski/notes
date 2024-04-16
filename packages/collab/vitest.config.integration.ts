import { exec } from 'child_process';
import { join } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/**/*.int.test.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});

// Ensure MongoDB container is running
const mongoDBDockerPath = join(__dirname, '../../docker/mongodb');
exec(`cd ${mongoDBDockerPath} && docker compose ps`, (err, stdout) => {
  if (!err && !stdout.includes('mongodb')) {
    console.error(
      `MongoDB container is not running. Integration tests cannot run without it.\n` +
        `Please start MongoDB container with commad 'npm run mongodb:start'`
    );
    process.exit(-1);
  }
});
