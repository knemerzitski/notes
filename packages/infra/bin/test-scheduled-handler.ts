import 'source-map-support/register.js';
import { join } from 'node:path';

import { App } from 'aws-cdk-lib';

import { loadEnvironmentVariables, assertGetEnvironmentVariables } from '~utils/env';
import { createLogger } from '~utils/logging';
import { logNodeInfo } from '~utils/node';
import { getProjectRootDir } from '~utils/project-dir';

import { ScheduledHandlerStack } from '../test/stacks/scheduled-handler-stack';

/**
 * DO NOT DEPLOY, ONLY FOR TESTING APP
 */

const NODE_ENV = process.env.NODE_ENV ?? 'test';

const logger = createLogger('test-scheduled-handler');

logNodeInfo(logger);
loadEnvironmentVariables(logger);

const app = new App();

const rootDir = getProjectRootDir();

const env = assertGetEnvironmentVariables(['MONGODB_URI', 'DOCKER_MONGODB_SERVICE_NAME']);

// Replace host with docker service name
const mongoDBUrl = new URL(env.MONGODB_URI);
mongoDBUrl.host = env.DOCKER_MONGODB_SERVICE_NAME;
mongoDBUrl.searchParams.set('directConnection', 'true');
const dockerMongoDBUri = mongoDBUrl.toString();

new ScheduledHandlerStack(app, 'TESTINGONLYScheduledHandlerStack', {
  customProps: {
    scheduled: {
      codePath: join(rootDir, 'packages/api-dev-server/out/mock-scheduled-handler'),
      environment: {
        NODE_ENV,
        DEBUG: process.env.LAMBDA_DEBUG_ARG ?? '*',
        DEBUG_FORMAT: process.env.DEBUG_FORMAT ?? 'object',
        MONGODB_URI: dockerMongoDBUri,
      },
    },
  },
});
