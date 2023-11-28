import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketMessageHandler,
  WebSocketMessageHandlerParams,
} from '~lambda-graphql/message-handler';

import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBParams,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from './schema/context';

export function createDefaultParams(): WebSocketMessageHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
> {
  const name = 'websocket-message-handler';
  const logger = createLogger(name);

  return {
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
