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
    include: ['lib/**/*.int.test.ts', '__test__/**/*.int.test.ts'],
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

// Ensure sam local api is running
exec(`curl -I -X OPTIONS http://127.0.0.1:3000/graphql`, (err, stdout) => {
  if (!err && !stdout.startsWith('HTTP/1.1 200 OK')) {
    console.error(
      `SAM local API is not running. Integration tests cannot run without it.\n` +
        `Please start API with commad 'npm run -w infra test:int:start-api'. \n` +
        `Cloudformation must be syntheized: 'npm run -w infra test:int:synth'.`
    );
    process.exit(1);
  }
});
