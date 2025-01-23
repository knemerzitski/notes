import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import {
  ApolloHttpGraphQLContext,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ConnectionTtlContext } from '~lambda-graphql/dynamodb/models/connection';
import { WebSocketMessageHandlerParams } from '~lambda-graphql/message-handler';

import {
  ApiGraphQLContext,
  ApiOptions,
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
} from '../graphql/types';

import { isAuthenticated } from '../services/auth/is-authenticated';
import { fromHeaders as parseAuthFromHeaders } from '../services/auth/parse-authentication-context';
import { SessionDuration } from '../services/session/duration';

export function createErrorBaseSubscriptionResolversContext(
  name = 'websocket-handler'
): Omit<BaseSubscriptionResolversContext, 'logger' | 'connectionId'> {
  function createErrorProxy(propertyName: string) {
    return new Proxy(
      {},
      {
        get() {
          return `${propertyName} is not available in ${name}`;
        },
      }
    );
  }

  return {
    get mongoDB() {
      return createErrorProxy('mongodb') as ApiGraphQLContext['mongoDB'];
    },
    get request() {
      return createErrorProxy('request') as ApolloHttpGraphQLContext['request'];
    },
    get response() {
      return createErrorProxy('response') as ApolloHttpGraphQLContext['response'];
    },
    publish() {
      throw new Error(`Publish should never be called in ${name}`);
    },
  };
}

export const handleConnectionInitAuthenticate: WebSocketMessageHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
>['onConnectionInit'] = async ({ message, context, baseGraphQLContext }) => {
  const { auth } = baseGraphQLContext;
  if (isAuthenticated(auth) || auth.reason !== AuthenticationFailedReason.USER_UNDEFINED)
    return;

  const payload = message.payload;
  if (!payload) return;

  const anyHeaders = payload.headers;
  if (!anyHeaders || typeof anyHeaders !== 'object') return;

  const headers = Object.fromEntries(
    Object.entries(anyHeaders).map(([key, value]) => [key, String(value)])
  );

  const newAuth = await parseAuthFromHeaders(headers, {
    ...context.graphQLContext,
    ...baseGraphQLContext,
  });

  if (!isAuthenticated(newAuth)) return;

  return {
    ...baseGraphQLContext,
    auth: newAuth,
  };
};

export const createIsCurrentConnection: CreateApolloHttpHandlerParams<BaseGraphQLContext>['createIsCurrentConnection'] =
  (_ctx, event) => {
    const wsConnectionId = event.headers[CustomHeaderName.WS_CONNECTION_ID];
    if (!wsConnectionId) return;
    return (connectionId: string) => wsConnectionId === connectionId;
  };

export function createDynamoDBConnectionTtlContext(
  options?: ApiOptions
): ConnectionTtlContext {
  const sessionDuration = new SessionDuration(
    options?.sessions?.webSocket ?? {
      duration: 1000 * 60 * 60 * 3, // 3 hours
      refreshThreshold: 1 / 3, // 1 hour
    }
  );

  return {
    defaultTtl: sessionDuration.new.bind(sessionDuration),
    tryRefreshTtl: sessionDuration.tryRefresh.bind(sessionDuration),
  };
}
