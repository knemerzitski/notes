import path from 'path';

import dotenv from 'dotenv';
import { Connection } from 'mongoose';
import WebSocket from 'ws';

import { handleConnectGraphQLAuth } from '~api/connect-handler';
import { InitMessageGraphQLContext } from '~api/message-handler';
import { BaseGraphQLContext, GraphQLResolversContext } from '~api/schema/context';
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

    let mongoose: Connection | undefined;

    const sockets: Record<string, WebSocket> = {};

    const server = createLambdaServer({
      sockets,
      connectHandler: createWebSocketConnectHandler<BaseGraphQLContext>({
        logger: createLogger('mock:websocket-connect-handler'),
        dynamoDB: createMockDynamoDBParams(),
        async onConnect({ event }) {
          if (!mongoose) {
            mongoose = (await createMockMongooseContext()).connection;
          }
          return handleConnectGraphQLAuth(mongoose, event);
        },
        defaultTtl() {
          return Math.floor(Date.now() / 1000) + 1 * 60 * 60; // in seconds, 1 hour
        },
      }),
      messageHandler: createWebSocketMessageHandler<
        InitMessageGraphQLContext,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:websocket-message-handler'),
        dynamoDB: createMockDynamoDBParams(),
        apiGateway: createMockApiGatewayParams(sockets),
        graphQl: createMockSubscriptionGraphQLParams(),
        graphQLContext: {
          get mongoose() {
            return new Proxy(
              {},
              {
                get() {
                  throw new Error(
                    'Mongoose is not available in mock:websocket-message-handler'
                  );
                },
              }
            ) as Connection;
          },
          get request() {
            return new Proxy(
              {},
              {
                get() {
                  throw new Error(
                    'Request is not available in mock:websocket-message-handler'
                  );
                },
              }
            ) as {
              headers: Record<string, string>;
              multiValueHeaders: Record<string, string[]>;
            };
          },
          get response() {
            return new Proxy(
              {},
              {
                get() {
                  throw new Error(
                    'Response is not available in mock:websocket-message-handler'
                  );
                },
              }
            ) as {
              headers: Record<string, string>;
              multiValueHeaders: Record<string, string[]>;
            };
          },
          publish() {
            throw new Error(
              'Publish should never be called in mock:websocket-message-handler'
            );
          },
        },
      }),
      disconnectHandler: createWebSocketDisconnectHandler({
        logger: createLogger('mock:websocket-disconnect-handler'),
        dynamoDB: createMockDynamoDBParams(),
      }),
      apolloHttpHandler: createApolloHttpHandler<
        Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
        BaseGraphQLContext
      >({
        logger: createLogger('mock:apollo-websocket-handler'),
        graphQL: createMockGraphQLParams(),
        async createGraphQLContext() {
          if (!mongoose) {
            mongoose = (await createMockMongooseContext()).connection;
          }

          return {
            mongoose,
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
