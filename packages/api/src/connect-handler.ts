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
  parseDynamoDBBaseGraphQLContext,
  serializeBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/context';
import CookiesContext, { parseCookiesFromHeaders } from './graphql/cookies-context';
import {
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
} from './handler-params';

export async function handleConnectGraphQLAuth(
  mongoDBCollections: Parameters<typeof parseAuthFromHeaders>['2'],
  event: WebSocketConnectEventEvent
): Promise<DynamoDBBaseGraphQLContext> {
  const cookiesCtx = CookiesContext.parse(parseCookiesFromHeaders(event.headers));

  const authCtx = await parseAuthFromHeaders(
    event.headers,
    cookiesCtx,
    mongoDBCollections
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

  let mongodb: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }
      return handleConnectGraphQLAuth(mongodb.collections, event);
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDefaultDynamoDBConnectionTtlContext(),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
