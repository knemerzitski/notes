import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
  createErrorBaseSubscriptionResolversContext,
  handleConnectionInitAuthenticate,
  parseDynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import {
  createDefaultApiOptions,
  createDefaultDynamoDBConnectionTtlContext,
} from '~api/handler-params';
import { createMongoDBLoaders } from '~api/mongodb/loaders';
import {
  WebSocketMessageHandlerParams,
  createWebSocketMessageHandler,
} from '~lambda-graphql/message-handler';
import { createLogger } from '~utils/logger';

import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockMongoDBContext,
  createMockSubscriptionGraphQLParams,
} from '../handler-params';

interface MockWebSocketMessageHandlerOptions {
  mongodb?: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;
  sockets?: Record<string, WebSocket>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockCreateDefaultParams(
  options?: MockWebSocketMessageHandlerOptions
): WebSocketMessageHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  let mongoDB = options?.mongodb;
  const sockets = options?.sockets;

  const apiOptions = createDefaultApiOptions();

  return {
    logger: createLogger('mock:ws-message-handler'),
    dynamoDB: createMockDynamoDBParams(),
    apiGateway: createMockApiGatewayParams(sockets),
    graphQL: createMockSubscriptionGraphQLParams(),
    async createGraphQLContext() {
      if (!mongoDB) {
        mongoDB = await createMockMongoDBContext();
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(),
        logger: createLogger('mock:ws-message-gql-context'),
        mongoDB: {
          ...mongoDB,
          loaders: createMongoDBLoaders(mongoDB),
        },
        options: apiOptions,
      };
    },
    connection: createDefaultDynamoDBConnectionTtlContext(),
    //pingpong: createMockPingPongParams(sockets),
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    onConnectionInit: handleConnectionInitAuthenticate,
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketMessageHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
