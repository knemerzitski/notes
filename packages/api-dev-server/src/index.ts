import './load-env';

import WebSocket from 'ws';

import { handleConnectGraphQLAuth } from '~api/connect-handler';
import { parseAuthFromHeaders } from '~api/graphql/auth-context';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
  GraphQLResolversContext,
  createErrorBaseSubscriptionResolversContext,
  handleConnectionInitAuthenticate,
  parseDynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import CookiesContext, { parseCookiesFromHeaders } from '~api/graphql/cookies-context';
import {
  createDefaultDataSources,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultIsCurrentConnection,
} from '~api/handler-params';
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
  createMockMongoDBContext,
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

    let mongodb: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;

    const sockets: Record<string, WebSocket> = {};

    const server = createLambdaServer({
      sockets,
      connectHandler: createWebSocketConnectHandler<
        BaseGraphQLContext,
        DynamoDBBaseGraphQLContext
      >({
        logger: createLogger('mock:ws-connect-handler'),
        connection: createDefaultDynamoDBConnectionTtlContext(),
        dynamoDB: createMockDynamoDBParams(),
        async onConnect({ event }) {
          if (!mongodb) {
            mongodb = await createMockMongoDBContext();
          }

          return handleConnectGraphQLAuth(mongodb.collections, event);
        },
        parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
      }),
      messageHandler: createWebSocketMessageHandler<
        BaseSubscriptionResolversContext,
        BaseGraphQLContext,
        DynamoDBBaseGraphQLContext
      >({
        logger: createLogger('mock:ws-message-handler'),
        dynamoDB: createMockDynamoDBParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        graphQL: createMockSubscriptionGraphQLParams(),
        async createGraphQLContext() {
          if (!mongodb) {
            mongodb = await createMockMongoDBContext();
          }

          return {
            ...createErrorBaseSubscriptionResolversContext(),
            logger: createLogger('mock:ws-message-gql-context'),
            mongodb,
            datasources: createDefaultDataSources({
              notes: {
                mongodb,
              },
            }),
          };
        },
        connection: createDefaultDynamoDBConnectionTtlContext(),
        //pingpong: createMockPingPongParams(sockets),
        parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
        onConnectionInit: handleConnectionInitAuthenticate,
      }),
      disconnectHandler: createWebSocketDisconnectHandler<
        BaseSubscriptionResolversContext,
        BaseGraphQLContext,
        DynamoDBBaseGraphQLContext
      >({
        logger: createLogger('mock:ws-disconnect-handler'),
        dynamoDB: createMockDynamoDBParams(),
        graphQL: createMockSubscriptionGraphQLParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        async createGraphQLContext() {
          if (!mongodb) {
            mongodb = await createMockMongoDBContext();
          }

          return {
            ...createErrorBaseSubscriptionResolversContext(),
            logger: createLogger('mock:ws-disconnect-gql-context'),
            mongodb,
            datasources: createDefaultDataSources({
              notes: {
                mongodb,
              },
            }),
          };
        },
        parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
      }),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        DynamoDBBaseGraphQLContext
      >({
        logger: createLogger('mock:apollo-http-handler'),
        graphQL: createMockGraphQLParams(),
        async createGraphQLContext(_ctx, event) {
          if (!mongodb) {
            mongodb = await createMockMongoDBContext();
          }

          const cookiesCtx = CookiesContext.parse(parseCookiesFromHeaders(event.headers));

          const authCtx = await parseAuthFromHeaders(
            event.headers,
            cookiesCtx,
            mongodb.collections
          );

          return {
            cookies: cookiesCtx,
            auth: authCtx,
            mongodb,
            datasources: createDefaultDataSources({
              notes: {
                mongodb,
              },
            }),
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
        createIsCurrentConnection: createDefaultIsCurrentConnection,
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
