import 'source-map-support/register';
import { exec } from 'child_process';
import path, { join } from 'path';

import { App } from 'aws-cdk-lib';

import { createLambdaGraphQLDynamoDBTables } from '~api-dev-server/utils/lambda-graphql-dynamodb';

import { TestNotesStack } from '../lib/stacks/test-notes-stack';
import {
  assertGetEnvironmentVariables,
  loadEnvironmentVariables,
} from '../lib/utils/env';
import { PROJECT_DIR } from '../lib/utils/project-dir';

/**
 * DO NOT DEPLOY, ONLY FOR TESTING APP
 */

const NODE_ENV = process.env.NODE_ENV ?? 'test';

console.log(`Running CDK in '${NODE_ENV}' environment`);
loadEnvironmentVariables();

const app = new App();

const definedVars = assertGetEnvironmentVariables([
  'VITE_GRAPHQL_HTTP_URL',
  'VITE_MOCK_GOOGLE_AUTH',
  'TEST_DOCKER_MONGODB_URI',
  'TEST_DOCKER_DYNAMODB_ENDPOINT',
  'MOCK_DYNAMODB_ENDPOINT',
]);

// Ensure DynamoDB is running
const dynamoDBDockerPath = join(PROJECT_DIR, '../../docker/dynamodb');
exec(`cd ${dynamoDBDockerPath} && docker compose ps`, (err, stdout) => {
  if (!err && !stdout.includes('dynamodb-local')) {
    console.error(
      `DynamoDB container is not running. Cannot synth test app without it.\n` +
        `Please start DynamoDB container with command 'npm run dynamodb:start'`
    );
    process.exit(1);
  }
});

// Ensure DynamoDB tables are created
await createLambdaGraphQLDynamoDBTables({
  endpoint: definedVars.MOCK_DYNAMODB_ENDPOINT,
});

new TestNotesStack(app, 'TESTINGONLYNotesStack', {
  customProps: {
    apolloHttpLambda: {
      codePath: path.join(
        PROJECT_DIR,
        '../api-dev-server/out-handlers/mock-apollo-http-handler'
      ),
      environment: {
        NODE_ENV,
        DEBUG: process.env.LAMBDA_DEBUG_ARG ?? '*',
        MOCK_MONGODB_URI: definedVars.TEST_DOCKER_MONGODB_URI,
        MOCK_DYNAMODB_ENDPOINT: definedVars.TEST_DOCKER_DYNAMODB_ENDPOINT,
        VITE_GRAPHQL_HTTP_URL: definedVars.VITE_GRAPHQL_HTTP_URL,
        VITE_MOCK_GOOGLE_AUTH: definedVars.VITE_MOCK_GOOGLE_AUTH,
      },
    },
    api: {
      url: definedVars.VITE_GRAPHQL_HTTP_URL,
    },
  },
});
