import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketMessageHandler,
  WebSocketMessageHandlerParams,
} from '~lambda-graphql/message-handler';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from './graphql/context';
import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';

export function createDefaultParams(): WebSocketMessageHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
> {
  const name = 'websocket-message-handler';
  const logger = createLogger(name);

  return {
    connection: createDefaultDynamoDBConnectionTtlContext(),
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
    graphQl: createDefaultSubscriptionGraphQLParams(logger),
    graphQLContext: createErrorBaseSubscriptionResolversContext(name),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketMessageHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
>(createDefaultParams());
