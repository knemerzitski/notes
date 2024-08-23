import { exec } from 'child_process';
import { join } from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

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

// Ensure DynamoDB is running
const dynamoDBDockerPath = join(__dirname, '../../docker/dynamodb');
exec(`cd ${dynamoDBDockerPath} && docker compose ps`, (err, stdout) => {
  if (!err && !stdout.includes('dynamodb-local')) {
    console.error(
      `DynamoDB container is not running. Integration tests cannot run without it.\n` +
        `Please start DynamoDB container with commad 'npm run dynamodb:start'`
    );
    process.exit(1);
  }
});
