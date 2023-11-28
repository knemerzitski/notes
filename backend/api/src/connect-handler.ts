import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Connection } from 'mongoose';

import { createLogger } from '~common/logger';
import {
  createWebSocketConnectHandler,
  WebSocketConnectEventEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';

import {
  createDefaultDynamoDBParams,
  createDefaultMongooseContext,
} from './handler-params';
import { BaseGraphQLContext } from './schema/context';
import { getIdentityFromHeaders } from './schema/session/identity';

export async function handleConnectGraphQLAuth(
  mongoose: Connection,
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

  let mongoose: Connection | undefined;

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongoose) {
        mongoose = (await createDefaultMongooseContext(logger)).connection;
      }
      return handleConnectGraphQLAuth(mongoose, event);
    },
    defaultTtl() {
      return Math.floor(Date.now() / 1000) + 1 * 60 * 60; // in seconds, 1 hour
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
