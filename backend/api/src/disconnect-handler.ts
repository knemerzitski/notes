import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketDisconnectHandler,
  WebSocketDisconnectHandlerParams,
} from '~lambda-graphql/disconnect-handler';

import { createDefaultDynamoDBParams } from './handler-params';
import { BaseGraphQLContext } from './schema/context';

export function createDefaultParams(): WebSocketDisconnectHandlerParams<BaseGraphQLContext> {
  const logger = createLogger('websocket-disconnect-handler');

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketDisconnectHandler(createDefaultParams());
