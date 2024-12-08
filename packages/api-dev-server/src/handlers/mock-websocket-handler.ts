import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
} from '~api/graphql/types';
import {
  CreateWebSocketHandlerDefaultParamsOptions,
  createWebSocketHandlerDefaultParams,
} from '~api/websocket-handler';
import { createWebSocketHandler } from '~lambda-graphql/websocket-handler';
import { createLogger } from '~utils/logging';

import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockMongoDBContext,
  createMockPingPongParams,
  createMockSubscriptionGraphQLParams,
} from '../parameters';

export interface MockWebSocketHandlerDefaultParamsOptions {
  sockets?: Record<string, WebSocket>;
}

export function mockWebSocketHandlerDefaultParamsOptions(
  options?: MockWebSocketHandlerDefaultParamsOptions
): CreateWebSocketHandlerDefaultParamsOptions {
  return {
    override: {
      logger: createLogger('mock:ws-handler'),
      gqlContextLogger: createLogger('mock:ws-gql-context'),
      createMongoDBContext: createMockMongoDBContext,
      createDefaultSubscriptionGraphQLParams: createMockSubscriptionGraphQLParams,
      createDynamoDBParams: createMockDynamoDBParams,
      createApiGatewayParams: () => createMockApiGatewayParams(options?.sockets),
    },
    pingPongParams: options?.sockets
      ? createMockPingPongParams(options.sockets)
      : undefined,
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(createWebSocketHandlerDefaultParams(mockWebSocketHandlerDefaultParamsOptions()));
