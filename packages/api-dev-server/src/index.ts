import './load-env';

import WebSocket from 'ws';
import { createApolloHttpHandlerDefaultParams } from '~api/apollo-http-handler';
import { DynamoDBBaseGraphQLContext, GraphQLResolversContext } from '~api/graphql/types';
import { createInitializeHandler } from '~api/initialize-handler';
import { createWebSocketHandlerDefaultParams } from '~api/websocket-handler';
import {
  createApolloHttpHandler,
  ApolloHttpGraphQLContext,
} from '~lambda-graphql/apollo-http-handler';
import { createWebSocketHandler } from '~lambda-graphql/websocket-handler';
import { assertGetEnvironmentVariables } from '~utils/env';
import { createLogger } from '~utils/logging';

import { isEnvironmentVariableTruthy } from '~utils/string/is-environment-variable-truthy';

import { mockApolloHttpHandlerDefaultParamsOptions } from './handlers/mock-apollo-http-handler';
import { mockCreateInitializeHandlerOptions } from './handlers/mock-initialize-handler';
import { mockWebSocketHandlerDefaultParamsOptions } from './handlers/mock-websocket-handler';
import { createLambdaServer } from './lambda-server';
import { createLambdaContext } from './utils/lambda-context';
import {
  createLambdaGraphQLDynamoDBTables,
  waitForDynamoDBPort,
} from './utils/lambda-graphql-dynamodb';
import { waitForMongoDBPort } from './utils/mongodb';

const logger = createLogger('mock:lambda-graphql-server');

const env = assertGetEnvironmentVariables(['MONGODB_URI', 'DYNAMODB_ENDPOINT']);

const noDBMode = isEnvironmentVariableTruthy(process.env.NO_DB_MODE);
if (noDBMode) {
  logger.info('index', 'Running server in NO_DB_MODE. Not connecting to any databases.');
}

void (async () => {
  try {
    if (!noDBMode) {
      await Promise.all([
        waitForMongoDBPort(env.MONGODB_URI, logger),
        waitForDynamoDBPort(env.DYNAMODB_ENDPOINT, logger),
      ]);
    }

    if (!noDBMode) {
      // Run initialize handler once at the start
      const initalizeHandler = createInitializeHandler(
        mockCreateInitializeHandlerOptions()
      );

      const initializeResult = initalizeHandler(undefined, createLambdaContext(), () => {
        return;
      });
      if (initializeResult instanceof Promise) {
        initializeResult.catch((err: unknown) => {
          logger.error('Initialize failed', err);
        });
      }
    }

    if (!noDBMode) {
      await createLambdaGraphQLDynamoDBTables({
        endpoint: env.DYNAMODB_ENDPOINT,
        logger,
      });
    }

    const sockets: Record<string, WebSocket> = {};

    const server = createLambdaServer({
      sockets,
      webSocketHandler: createWebSocketHandler(
        createWebSocketHandlerDefaultParams(
          mockWebSocketHandlerDefaultParamsOptions({
            sockets,
          })
        )
      ),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        DynamoDBBaseGraphQLContext
      >(
        createApolloHttpHandlerDefaultParams(
          mockApolloHttpHandlerDefaultParamsOptions({
            sockets,
          })
        )
      ),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      httpUrl: new URL(process.env.VITE_GRAPHQL_HTTP_URL!),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      wsUrl: new URL(process.env.VITE_GRAPHQL_WS_URL!),
      logger,
      skipDBConnect: noDBMode,
    });

    const gracefulShutdown = () => {
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
