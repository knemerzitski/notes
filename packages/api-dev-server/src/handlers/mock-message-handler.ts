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
  createDefaultDataSources,
  createDefaultDynamoDBConnectionTtlContext,
} from '~api/handler-params';
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
  let mongodb = options?.mongodb;
  const sockets = options?.sockets;

  return {
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
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketMessageHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
