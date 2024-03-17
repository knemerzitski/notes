import './load-env';

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
import { createApolloHttpHandler } from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createWebSocketConnectHandler } from '~lambda-graphql/connect-handler';
import { createWebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';
import { createWebSocketMessageHandler } from '~lambda-graphql/message-handler';
import { createLogger } from '~utils/logger';

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
        logger: createLogger('mock:ws-connect-handler'),
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
        logger: createLogger('mock:ws-message-handler'),
        dynamoDB: createMockDynamoDBParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        graphQl: createMockSubscriptionGraphQLParams(),
        async createGraphQLContext() {
          if (!mongoose) {
            mongoose = await createMockMongooseContext();
          }

          return {
            ...createErrorBaseSubscriptionResolversContext(),
            logger: createLogger('mock:ws-message-gql-context'),
            mongoose,
          };
        },
        connection: createDefaultDynamoDBConnectionTtlContext(),
        //pingpong: createMockPingPongParams(sockets),
      }),
      disconnectHandler: createWebSocketDisconnectHandler<
        BaseSubscriptionResolversContext,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:ws-disconnect-handler'),
        dynamoDB: createMockDynamoDBParams(),
        graphQl: createMockSubscriptionGraphQLParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        async createGraphQLContext() {
          if (!mongoose) {
            mongoose = await createMockMongooseContext();
          }

          return {
            ...createErrorBaseSubscriptionResolversContext(),
            logger: createLogger('mock:ws-disconnect-gql-context'),
            mongoose,
          };
        },
      }),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:apollo-http-handler'),
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
