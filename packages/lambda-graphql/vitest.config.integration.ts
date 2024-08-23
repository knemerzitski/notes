import { exec } from 'child_process';
import { join } from 'path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
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
    watch: true,
  },
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
