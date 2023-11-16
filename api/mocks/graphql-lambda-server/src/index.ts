import path from 'path';

import { createLogger } from '@/utils/logger';
import dotenv from 'dotenv';

import { createLambdaGraphQlServer } from './createLambdaGraphQlServer';
import { createEnvLambdaHandlers } from './handlers/createEnvLambdaHandlersContext';

const logger = createLogger('mock:lambda-graphql-server');

logger.info('index:NODE_ENV', { NODE_ENV: process.env.NODE_ENV });

const relEnvPath = `./../../../../${process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'}`;
const envPath = path.join(__dirname, relEnvPath);
dotenv.config({ path: envPath });

logger.info('index:env-load', { path: envPath.toString() });

(async () => {
  try {
    const server = await createLambdaGraphQlServer({
      handlerContext: createEnvLambdaHandlers(),
      httpUrl: new URL(process.env.VITE_GRAPHQL_HTTP_URL!),
      wsUrl: new URL(process.env.VITE_GRAPHQL_WS_URL!),
      logger,
    });

    const gracefulShutdown = async () => {
      logger.info('index:shutdown');
      server.stop();
      process.exit();
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown);
  } catch (err) {
    logger.error('index', err as Error);
    process.exit(1);
  }
})();
