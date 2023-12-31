import path from 'path';

import dotenv from 'dotenv';
import WebSocket from 'ws';

import { handleConnectGraphQLAuth } from '~api/connect-handler';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  GraphQLResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from '~api/graphql/context';
import { newExpireAt, tryRefreshExpireAt } from '~api/graphql/session/expire';
import { createDefaultDynamoDBConnectionTtlContext } from '~api/handler-params';
import { createLogger } from '~common/logger';
import { createApolloHttpHandler } from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createWebSocketConnectHandler } from '~lambda-graphql/connect-handler';
import { createWebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';
import { createWebSocketMessageHandler } from '~lambda-graphql/message-handler';

import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockGraphQLParams,
  createMockMongooseContext,
  createMockSubscriptionGraphQLParams,
} from './handler-params';
import { createLambdaServer } from './lambda-server';
import { createLambdaGraphQLDynamoDBTables } from './utils/lambda-graphql-dynamodb';

const logger = createLogger('mock:lambda-graphql-server');

logger.info('index:NODE_ENV', { NODE_ENV: process.env.NODE_ENV });

const relEnvPath = `../../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;
const envPath = path.join(__dirname, relEnvPath);
dotenv.config({ path: envPath });

logger.info('index:env-load', { path: envPath.toString() });

void (async () => {
  try {
    if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
      throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
    }
    await createLambdaGraphQLDynamoDBTables({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      logger,
    });

    let mongoose: Awaited<ReturnType<typeof createMockMongooseContext>> | undefined;

    const sockets: Record<string, WebSocket> = {};

    const server = createLambdaServer({
      sockets,
      connectHandler: createWebSocketConnectHandler<BaseGraphQLContext>({
        logger: createLogger('mock:websocket-connect-handler'),
        connection: createDefaultDynamoDBConnectionTtlContext(),
        dynamoDB: createMockDynamoDBParams(),
        async onConnect({ event }) {
          if (!mongoose) {
            mongoose = await createMockMongooseContext();
          }
          return handleConnectGraphQLAuth(mongoose, event);
        },
      }),
      messageHandler: createWebSocketMessageHandler<
        BaseSubscriptionResolversContext,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:websocket-message-handler'),
        dynamoDB: createMockDynamoDBParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        graphQl: createMockSubscriptionGraphQLParams(),
        graphQLContext: createErrorBaseSubscriptionResolversContext(
          'mock:websocket-message-handler'
        ),
        connection: createDefaultDynamoDBConnectionTtlContext(),
        //pingpong: createMockPingPongParams(sockets),
      }),
      disconnectHandler: createWebSocketDisconnectHandler<
        BaseSubscriptionResolversContext,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:websocket-disconnect-handler'),
        dynamoDB: createMockDynamoDBParams(),
        graphQl: createMockSubscriptionGraphQLParams(),
        graphQLContext: createErrorBaseSubscriptionResolversContext(
          'mock:websocket-disconnect-handler'
        ),
      }),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:apollo-websocket-handler'),
        graphQL: createMockGraphQLParams(),
        async createGraphQLContext() {
          if (!mongoose) {
            mongoose = await createMockMongooseContext();
          }

          return {
            mongoose,
            session: {
              newExpireAt,
              tryRefreshExpireAt,
            },
            subscribe: () => {
              throw new Error('Subscribe should never be called in apollo-http-handler');
            },
            denySubscription: () => {
              throw new Error(
                'denySubscription should never be called in apollo-http-handler'
              );
            },
          };
        },
        dynamoDB: createMockDynamoDBParams(),
        apiGateway: createMockApiGatewayParams(sockets),
      }),
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
