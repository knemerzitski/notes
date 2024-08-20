import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import { handleConnectGraphQLAuth } from '~api/connect-handler';
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
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
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
): WebSocketHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  let mongodb = options?.mongodb;
  const sockets = options?.sockets;

  const apiOptions = createDefaultApiOptions();

  return {
    logger: createLogger('mock:ws-handler'),
    dynamoDB: createMockDynamoDBParams(),
    apiGateway: createMockApiGatewayParams(sockets),
    graphQL: createMockSubscriptionGraphQLParams(),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return handleConnectGraphQLAuth(event, mongodb.collections);
    },
    async createGraphQLContext() {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(),
        logger: createLogger('mock:ws-gql-context'),
        mongodb: {
          ...mongodb,
          loaders: createMongoDBLoaders(mongodb),
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

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
