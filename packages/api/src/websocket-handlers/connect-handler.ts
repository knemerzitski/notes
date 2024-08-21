import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketConnectHandler,
  WebSocketConnectEvent,
  WebSocketConnectHandlerParams,
} from '~lambda-graphql/connect-handler';
import { createLogger } from '~utils/logger';

import { ApiOptions } from '../graphql/api-options';
import {
  BaseGraphQLContext,
  parseDynamoDBBaseGraphQLContext,
  serializeBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from '../graphql/context';
import {
  createDefaultApiOptions,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
} from '../handler-params';
import { MongoDBCollections } from '../mongodb/collections';
import { QueryableSessionLoader } from '../mongodb/loaders/queryable-session-loader';
import { parseAuthenticationContextFromHeaders } from '../services/auth/auth';
import { Cookies, parseCookiesFromHeaders } from '../services/http/cookies';

export async function handleConnectGraphQLAuth(
  event: WebSocketConnectEvent,
  collections: MongoDBCollections,
  apiOptions?: ApiOptions
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

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongoDB) {
        mongoDB = await createDefaultMongoDBContext(logger);
      }
      return handleConnectGraphQLAuth(event, mongoDB.collections, apiOptions);
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDefaultDynamoDBConnectionTtlContext(apiOptions),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketConnectHandler(createDefaultParams());
