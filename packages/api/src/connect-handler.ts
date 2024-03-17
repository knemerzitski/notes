import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketConnectHandler,
  WebSocketConnectEventEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';
import { createLogger } from '~utils/logger';

import { BaseGraphQLContext, MongooseGraphQLContext } from './graphql/context';
import { parseAuthFromHeaders } from './graphql/session/auth-context';
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
    ? await parseAuthFromHeaders(event.headers, mongoose.model.Session)
    : undefined;

  return {
    auth,
  };
}

export function createDefaultParams(): WebSocketConnectHandlerParams<BaseGraphQLContext> {
  const logger = createLogger('ws-connect-handler');

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
