import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketConnectHandler,
  WebSocketConnectEventEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';
import { createLogger } from '~utils/logger';

import { parseAuthFromHeaders } from './graphql/auth-context';
import {
  BaseGraphQLContext,
  ApiGraphQLContext,
  parseDynamoDBBaseGraphQLContext,
  serializeBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/context';
import CookiesContext, { parseCookiesFromHeaders } from './graphql/cookies-context';
import {
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongooseContext,
} from './handler-params';

export async function handleConnectGraphQLAuth(
  mongoose: ApiGraphQLContext['mongoose'],
  event: WebSocketConnectEventEvent
): Promise<DynamoDBBaseGraphQLContext> {
  const cookiesCtx = CookiesContext.parse(parseCookiesFromHeaders(event.headers));

  const authCtx = await parseAuthFromHeaders(
    event.headers,
    cookiesCtx,
    mongoose.model.Session
  );

  return serializeBaseGraphQLContext({
    cookies: cookiesCtx,
    auth: authCtx,
  });
}

export function createDefaultParams(): WebSocketConnectHandlerParams<
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
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
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDefaultDynamoDBConnectionTtlContext(),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
