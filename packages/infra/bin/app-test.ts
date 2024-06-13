import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import {
  assertGetEnvironmentVariables,
  loadEnvironmentVariables,
} from '../lib/utils/env';
import { PROJECT_DIR } from '../lib/utils/project-dir';
import path from 'path';
import { TestNotesStack } from '../lib/stacks/test-notes-stack';
import { createLambdaGraphQLDynamoDBTables } from '~api-dev-server/utils/lambda-graphql-dynamodb';

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