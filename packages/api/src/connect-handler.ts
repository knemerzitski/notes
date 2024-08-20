import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
  createWebSocketConnectHandler,
  WebSocketConnectEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';
import { createLogger } from '~utils/logger';

import {
  BaseGraphQLContext,
  parseDynamoDBBaseGraphQLContext,
  serializeBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/context';
import {
  createDefaultApiOptions,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
} from './handler-params';
import { parseAuthenticationContextFromHeaders } from './services/auth/auth';
import { Cookies, parseCookiesFromHeaders } from './services/auth/cookies';
import { QueryableSessionLoader } from './mongodb/loaders/queryable-session-loader';
import { MongoDBCollections } from './mongodb/collections';
import { ApiOptions } from './graphql/api-options';

export async function handleConnectGraphQLAuth(
  event: WebSocketConnectEvent,
  collections: MongoDBCollections,
  apiOptions?: ApiOptions,
): Promise<DynamoDBBaseGraphQLContext> {
  const cookies = Cookies.parse(parseCookiesFromHeaders(event.headers));

  const authCtx = await parseAuthenticationContextFromHeaders({
    headers: event.headers,
    cookies,
    sessionParams: {
      loader: new QueryableSessionLoader({
        context: { collections },
      }),
      sessionDurationConfig: apiOptions?.sessions?.user,
    },
  });

  return serializeBaseGraphQLContext({
    cookies: cookies,
    auth: authCtx,
  });
}

export function createDefaultParams(): WebSocketConnectHandlerParams<
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  const logger = createLogger('ws-connect-handler');

  let mongodb: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }
      return handleConnectGraphQLAuth(event, mongodb.collections, apiOptions);
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDefaultDynamoDBConnectionTtlContext(apiOptions),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
