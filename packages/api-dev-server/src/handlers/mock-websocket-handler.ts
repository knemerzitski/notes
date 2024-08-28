import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import { createWebSocketHandler } from '~lambda-graphql/websocket-handler';
import { createLogger } from '~utils/logging';

import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockMongoDBContext,
  createMockSubscriptionGraphQLParams,
} from '../parameters';
import {
  CreateWebSocketHandlerDefaultParamsOptions,
  createWebSocketHandlerDefaultParams,
} from '~api/websocket-handler';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
} from '~api/graphql/types';

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
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(createWebSocketHandlerDefaultParams(mockWebSocketHandlerDefaultParamsOptions()));
