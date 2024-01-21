import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketDisconnectHandler,
  WebSocketDisconnectHandlerParams,
} from '~lambda-graphql/disconnect-handler';
import { createLogger } from '~utils/logger';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from './graphql/context';
import {
  createDefaultDynamoDBParams,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';

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
