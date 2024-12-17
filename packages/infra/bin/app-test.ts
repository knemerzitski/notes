import 'source-map-support/register.js';
import { join } from 'node:path';

import { App } from 'aws-cdk-lib';

import { createLambdaGraphQLDynamoDBTables } from '~api-dev-server/utils/lambda-graphql-dynamodb';

import { loadEnvironmentVariables, assertGetEnvironmentVariables } from '~utils/env';
import { createLogger } from '~utils/logging';
import { logNodeInfo } from '~utils/node';
import { getProjectRootDir } from '~utils/project-dir';

import { assertDynamoDBIsRunning } from '../../utils/src/running-processes';
import { TestNotesStack } from '../lib/stacks/test-notes-stack';

/**
 * DO NOT DEPLOY, ONLY FOR TESTING APP
 */

assertDynamoDBIsRunning();

const NODE_ENV = process.env.NODE_ENV ?? 'test';

const logger = createLogger('infra-app-test');

logNodeInfo(logger);
loadEnvironmentVariables(logger);

const app = new App();

const rootDir = getProjectRootDir();

const env = assertGetEnvironmentVariables([
  'VITE_GRAPHQL_HTTP_URL',
  'VITE_MOCK_GOOGLE_AUTH',

  'MONGODB_URI',
  'DOCKER_MONGODB_SERVICE_NAME',

  'DYNAMODB_ENDPOINT',
  'DOCKER_DYNAMODB_SERVICE_NAME',
]);

// Replace host with docker service name
const mongoDBUrl = new URL(env.MONGODB_URI);
mongoDBUrl.host = env.DOCKER_MONGODB_SERVICE_NAME;
mongoDBUrl.searchParams.set('directConnection', 'true');
const dockerMongoDBUri = mongoDBUrl.toString();

const dynamoDBUrl = new URL(env.DYNAMODB_ENDPOINT);
dynamoDBUrl.host = env.DOCKER_DYNAMODB_SERVICE_NAME;
const dockerDynamoDBEndpoint = dynamoDBUrl.toString();

// Ensure DynamoDB tables are created
await createLambdaGraphQLDynamoDBTables({
  endpoint: env.DYNAMODB_ENDPOINT,
});

new TestNotesStack(app, 'TESTINGONLYNotesStack', {
  customProps: {
    apolloHttpLambda: {
      codePath: join(rootDir, 'packages/api-dev-server/out/mock-apollo-http-handler'),
      environment: {
        NODE_ENV,
        DEBUG: process.env.LAMBDA_DEBUG_ARG ?? '*',
        MONGODB_URI: dockerMongoDBUri,
        DYNAMODB_ENDPOINT: dockerDynamoDBEndpoint,
        VITE_GRAPHQL_HTTP_URL: env.VITE_GRAPHQL_HTTP_URL,
        VITE_MOCK_GOOGLE_AUTH: env.VITE_MOCK_GOOGLE_AUTH,
        LAMBDA: '1',
      },
    },
    api: {
      url: env.VITE_GRAPHQL_HTTP_URL,
    },
  },
});
