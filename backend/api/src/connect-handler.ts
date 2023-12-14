import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { createLogger } from '~common/logger';
import {
  createWebSocketConnectHandler,
  WebSocketConnectEventEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';

import { BaseGraphQLContext, MongooseGraphQLContext } from './graphql/context';
import { getSessionUserFromHeaders } from './graphql/session/parse-cookies';
import {
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongooseContext,
} from './handler-params';

export async function handleConnectGraphQLAuth(
  mongoose: MongooseGraphQLContext['mongoose'],
  event: WebSocketConnectEventEvent
): Promise<BaseGraphQLContext> {
  const auth = event.headers
    ? await getSessionUserFromHeaders(mongoose, event.headers)
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
