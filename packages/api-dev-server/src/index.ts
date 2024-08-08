import './load-env';

import WebSocket from 'ws';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
  GraphQLResolversContext,
} from '~api/graphql/context';
import { createApolloHttpHandler } from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createWebSocketConnectHandler } from '~lambda-graphql/connect-handler';
import { createWebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';
import { createWebSocketMessageHandler } from '~lambda-graphql/message-handler';
import { createWebSocketHandler } from '~lambda-graphql/websocket-handler';
import { createLogger } from '~utils/logger';
import { isEnvVarStringTrue } from '~utils/string/is-env-var-string-true';

import { createMockMongoDBContext } from './handler-params';
import { mockCreateDefaultParams as mockCreateDefaultApolloHttpHandlerParams } from './handlers/mock-apollo-http-handler';
import { mockCreateDefaultParams as mockCreateDefaultWebSocketConnectParams } from './handlers/mock-connect-handler';
import { mockCreateDefaultParams as mockCreateDefaultDisconnectHandlerParams } from './handlers/mock-disconnect-handler';
import { mockCreateDefaultParams as mockCreateDefaultMessageHandlerParams } from './handlers/mock-message-handler';
import { mockCreateDefaultParams as mockCreateDefaultWebSocketHandlerParams } from './handlers/mock-websocket-handler';
import { createLambdaServer } from './lambda-server';
import { createLambdaGraphQLDynamoDBTables } from './utils/lambda-graphql-dynamodb';

const logger = createLogger('mock:lambda-graphql-server');

logger.info('index:NODE_ENV', { NODE_ENV: process.env.NODE_ENV });

void (async () => {
  try {
    if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
      throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
    }
    await createLambdaGraphQLDynamoDBTables({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      logger,
    });

    let mongodb: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;

    const sockets: Record<string, WebSocket> = {};

    const server = createLambdaServer({
      sockets,
      webSocketHandler: isEnvVarStringTrue(process.env.ROUTED_WEBSOCKET_HANDLER)
        ? {
            connect: createWebSocketConnectHandler<
              BaseGraphQLContext,
              DynamoDBBaseGraphQLContext
            >(
              mockCreateDefaultWebSocketConnectParams({
                mongodb,
              })
            ),
            message: createWebSocketMessageHandler<
              BaseSubscriptionResolversContext,
              BaseGraphQLContext,
              DynamoDBBaseGraphQLContext
            >(
              mockCreateDefaultMessageHandlerParams({
                mongodb,
                sockets,
              })
            ),
            disconnect: createWebSocketDisconnectHandler<
              BaseSubscriptionResolversContext,
              BaseGraphQLContext,
              DynamoDBBaseGraphQLContext
            >(
              mockCreateDefaultDisconnectHandlerParams({
                mongodb,
                sockets,
              })
            ),
          }
        : createWebSocketHandler(
            mockCreateDefaultWebSocketHandlerParams({
              mongodb,
              sockets,
            })
          ),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        DynamoDBBaseGraphQLContext
      >(
        mockCreateDefaultApolloHttpHandlerParams({
          mongodb,
          sockets,
        })
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
