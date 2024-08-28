import './load-env';

import WebSocket from 'ws';
import { createApolloHttpHandler } from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createWebSocketHandler } from '~lambda-graphql/websocket-handler';
import { createLogger } from '~utils/logging';
import { mockApolloHttpHandlerDefaultParamsOptions } from './handlers/mock-apollo-http-handler';
import { createLambdaServer } from './lambda-server';
import { createLambdaGraphQLDynamoDBTables } from './utils/lambda-graphql-dynamodb';
import { createWebSocketHandlerDefaultParams } from '~api/websocket-handler';
import { mockWebSocketHandlerDefaultParamsOptions } from './handlers/mock-websocket-handler';
import { DynamoDBBaseGraphQLContext, GraphQLResolversContext } from '~api/graphql/types';
import { createApolloHttpHandlerParams } from '~api/apollo-http-handler';
import { createInitializeHandler } from '~api/initialize-handler';
import { createLambdaContext } from './utils/lambda-context';
import { mockCreateInitializeHandlerOptions } from './handlers/mock-initialize-handler';

const logger = createLogger('mock:lambda-graphql-server');

logger.info('index:NODE_ENV', { NODE_ENV: process.env.NODE_ENV });

void (async () => {
  try {
    // Run initialize handler once at the start
    const initalizeHandler = createInitializeHandler(
      mockCreateInitializeHandlerOptions()
    );

    await initalizeHandler(undefined, createLambdaContext(), () => {
      return;
    });

    if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
      throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
    }
    await createLambdaGraphQLDynamoDBTables({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      logger,
    });

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
        createApolloHttpHandlerParams(
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
