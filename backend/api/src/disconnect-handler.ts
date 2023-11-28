import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketDisconnectHandler,
  WebSocketDisconnectHandlerParams,
} from '~lambda-graphql/disconnect-handler';

import {
  createDefaultDynamoDBParams,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from './schema/context';

export function createDefaultParams(): WebSocketDisconnectHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
> {
  const name = 'websocket-disconnect-handler';
  const logger = createLogger(name);

  return {
    logger,
    graphQl: createDefaultSubscriptionGraphQLParams(logger),
    dynamoDB: createDefaultDynamoDBParams(logger),
    graphQLContext: createErrorBaseSubscriptionResolversContext(name),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketDisconnectHandler<BaseSubscriptionResolversContext, BaseGraphQLContext>(
    createDefaultParams()
  );
