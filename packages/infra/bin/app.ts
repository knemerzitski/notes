import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { NotesStack, NotesStackProps } from '../lib/stacks/notes-stack';
import {
  assertGetEnvironmentVariables,
  loadEnvironmentVariables,
} from '../lib/utils/env';
import isEnvVarStringTrue from '~utils/string/isEnvVarStringTrue';
import { PROJECT_DIR } from '../lib/utils/project-dir';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV ?? 'production';

console.log(`Running CDK in '${process.env.NODE_ENV}' environment`);
loadEnvironmentVariables();

const app = new App();

const definedEnvs = assertGetEnvironmentVariables([
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

const mongoDb: NotesStackProps['customProps']['mongoDb'] = {
  atlas: {
    region: process.env.MONGODB_ATLAS_REGION,
    profile: process.env.MONGODB_ATLAS_PROFILE,
    orgId: definedEnvs.MONGODB_ATLAS_ORG_ID,
    projectName: definedEnvs.MONGODB_ATLAS_PROJECT_NAME,
    clusterName: definedEnvs.MONGODB_ATLAS_CLUSTER_NAME,
    databaseName: definedEnvs.MONGODB_ATLAS_DATABASE_NAME,
  },
};

const lambdaEnvironment = {
  NODE_ENV: NODE_ENV,
  DEBUG: process.env.LAMBDA_DEBUG_ARG ?? '*',

  // MongoDB
  STS_REGION: process.env.STS_REGION ?? '',
  MONGODB_ATLAS_DATABASE_NAME: mongoDb.atlas.databaseName,

  // DynamoDB
  DYNAMODB_REGION: process.env.DYNAMODB_REGION ?? '',

  // WebSocket
  API_GATEWAY_MANAGEMENT_REGION: process.env.API_GATEWAY_MANAGEMENT_REGION ?? '',
};

new NotesStack(app, 'NotesStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  customProps: {
    lambda: {
      apolloHttp: {
        codePath: path.join(PROJECT_DIR, '../api/out/apollo-http-handler'),
        environment: lambdaEnvironment,
      },
      webSocket: {
        codePath: path.join(PROJECT_DIR, '../api/out/websocket-handler'),
        environment: lambdaEnvironment,
      },
    },
    mongoDb,
    api: {
      httpUrl: definedEnvs.VITE_GRAPHQL_HTTP_URL,
      webSocketUrl: definedEnvs.VITE_GRAPHQL_WS_URL,
    },
    domain: {
      definitions: definedEnvs.DOMAINS,
    },
    distribution: {
      certificateArn: definedEnvs.CLOUDFRONT_CERTIFICATE_ARN,
      disableCache: isEnvVarStringTrue(process.env.DEBUG_DISABLE_CDN_CACHING),
      viewerRequestFunction: {
        inFile: path.join(PROJECT_DIR, 'lib/cloudfront-functions/viewer-request.ts'),
        outFile: path.join(PROJECT_DIR, 'out/viewer-request.js'),
      },
    },
    app: {
      outPath: path.join(PROJECT_DIR, '../app/out'),
    },
  },
});
