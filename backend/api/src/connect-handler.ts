import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketConnectHandler,
  WebSocketConnectEventEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';

import {
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongooseContext,
} from './handler-params';
import { BaseGraphQLContext, MongooseGraphQLContext } from './schema/context';
import { getIdentityFromHeaders } from './schema/session/identity';

export async function handleConnectGraphQLAuth(
  mongoose: MongooseGraphQLContext['mongoose'],
  event: WebSocketConnectEventEvent
): Promise<BaseGraphQLContext> {
  const auth = event.headers
    ? await getIdentityFromHeaders(mongoose, event.headers)
    : undefined;

  return {
    auth,
  };
}

export function createDefaultParams(): WebSocketConnectHandlerParams<BaseGraphQLContext> {
  const logger = createLogger('websocket-connect-handler');

  let mongoose: Awaited<ReturnType<typeof createDefaultMongooseContext>> | undefined;

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongoose) {
        mongoose = await createDefaultMongooseContext(logger);
      }
      return handleConnectGraphQLAuth(mongoose, event);
    },
    connection: createDefaultDynamoDBConnectionTtlContext(),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
