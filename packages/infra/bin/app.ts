import 'source-map-support/register.js';
import { join } from 'node:path';

import { App } from 'aws-cdk-lib';

import { assertGetEnvironmentVariables, loadEnvironmentVariables } from '~utils/env';
import { createLogger } from '~utils/logging';
import { logNodeInfo } from '~utils/node';
import { getProjectRootDir } from '~utils/project-dir';
import { isEnvironmentVariableTruthy } from '~utils/string/is-environment-variable-truthy';

import { NotesStack, NotesStackProps } from '../lib/stacks/notes-stack';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

const logger = createLogger('infra-app');
logNodeInfo(logger);
loadEnvironmentVariables(logger);

const app = new App();

const rootDir = getProjectRootDir();

const env = assertGetEnvironmentVariables([
  'CDK_DEFAULT_ACCOUNT',
  'CDK_DEFAULT_REGION',

  'DOMAINS',
  'CLOUDFRONT_CERTIFICATE_ARN',

  'MONGODB_ATLAS_ORG_ID',

  // Require project and cluster name on deployment to prevent creating and deleting project every time
  'MONGODB_ATLAS_PROJECT_NAME',
  'MONGODB_ATLAS_CLUSTER_NAME',

  'MONGODB_ATLAS_DATABASE_NAME',

  'VITE_GRAPHQL_HTTP_URL',
  'VITE_GRAPHQL_WS_URL',
]);

const mongoDB: NotesStackProps['customProps']['mongoDB'] = {
  atlas: {
    region: process.env.MONGODB_ATLAS_REGION,
    profile: process.env.MONGODB_ATLAS_PROFILE,
    orgId: env.MONGODB_ATLAS_ORG_ID,
    projectName: env.MONGODB_ATLAS_PROJECT_NAME,
    clusterName: env.MONGODB_ATLAS_CLUSTER_NAME,
    databaseName: env.MONGODB_ATLAS_DATABASE_NAME,
  },
};

const commonLambdaEnvironment = {
  NODE_ENV,
  DEBUG: process.env.LAMBDA_DEBUG_ARG ?? '*',
  DEBUG_FORMAT: process.env.DEBUG_FORMAT ?? 'json',
};

const runtimeLambdaEnvironment = {
  ...commonLambdaEnvironment,
  // MongoDB
  STS_REGION: process.env.STS_REGION ?? '',

  // DynamoDB
  DYNAMODB_REGION: process.env.DYNAMODB_REGION ?? '',

  // WebSocket
  API_GATEWAY_MANAGEMENT_REGION: process.env.API_GATEWAY_MANAGEMENT_REGION ?? '',
};

new NotesStack(app, 'NotesStack', {
  env: {
    account: env.CDK_DEFAULT_ACCOUNT,
    region: env.CDK_DEFAULT_REGION,
  },
  customProps: {
    postDeployment: {
      codePath: join(rootDir, 'packages/api/out/initialize-handler'),
      environment: commonLambdaEnvironment,
    },
    lambda: {
      apolloHttp: {
        codePath: join(rootDir, 'packages/api/out/apollo-http-handler'),
        environment: runtimeLambdaEnvironment,
      },
      webSocket: {
        codePath: join(rootDir, 'packages/api/out/websocket-handler'),
        environment: runtimeLambdaEnvironment,
      },
    },
    mongoDB,
    api: {
      httpUrl: env.VITE_GRAPHQL_HTTP_URL,
      webSocketUrl: env.VITE_GRAPHQL_WS_URL,
    },
    domain: {
      definitions: env.DOMAINS,
    },
    distribution: {
      certificateArn: env.CLOUDFRONT_CERTIFICATE_ARN,
      disableCache: isEnvironmentVariableTruthy(process.env.DEBUG_DISABLE_CDN_CACHING),
      viewerRequestFunction: {
        inFile: join(
          rootDir,
          'packages/infra/lib/cloudfront-functions/viewer-request.ts'
        ),
        outFile: join(rootDir, 'packages/infra/out/viewer-request.js'),
      },
    },
    app: {
      outPath: join(rootDir, 'packages/app/out'),
    },
  },
});
