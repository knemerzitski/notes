import {
  ApolloHttpGraphQLContext,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import {
  ApiGraphQLContext,
  ApiOptions,
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
} from '../graphql/types';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { WebSocketMessageHandlerParams } from '~lambda-graphql/message-handler';
import { serializeBaseGraphQLContext } from '../graphql/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { ConnectionTtlContext } from '~lambda-graphql/dynamodb/models/connection';
import { SessionDuration } from '../services/session/duration';
import { isAuthenticated } from '../services/auth/is-authenticated';
import { parseAuthenticationContextFromHeaders } from '../services/auth/parse-authentication-context-from-headers';

export function createErrorBaseSubscriptionResolversContext(
  name = 'websocket-handler'
): Omit<BaseSubscriptionResolversContext, 'logger' | 'connectionId'> {
  function createErrorProxy(propertyName: string) {
    return new Proxy(
      {},
      {
        get() {
          `${propertyName} is not available in ${name}`;
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
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>['onConnectionInit'] = async ({
  message,
  context,
  baseGraphQLContext: { auth, cookies, ...restCtx },
}) => {
  if (isAuthenticated(auth) || auth.reason !== AuthenticationFailedReason.USER_UNDEFINED)
    return;

  const payload = message.payload;
  if (!payload) return;

  const anyHeaders = payload.headers;
  if (!anyHeaders || typeof anyHeaders !== 'object') return;

  const headers = Object.fromEntries(
    Object.entries(anyHeaders).map(([key, value]) => [key, String(value)])
  );

  const newAuth = await parseAuthenticationContextFromHeaders({
    headers,
    cookies,
    sessionParams: {
      loader: context.graphQLContext.mongoDB.loaders.session,
      sessionDurationConfig: context.graphQLContext.options?.sessions?.user,
    },
  });

  if (!isAuthenticated(newAuth)) return;

  return serializeBaseGraphQLContext({
    ...restCtx,
    auth: newAuth,
    cookies: cookies,
  });
};

export const createIsCurrentConnection: CreateApolloHttpHandlerParams<
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>['createIsCurrentConnection'] = (_ctx, event) => {
  const wsConnectionId = event.headers[CustomHeaderName.WS_CONNECTION_ID];
  if (!wsConnectionId) return;
  return (connectionId: string) => wsConnectionId === connectionId;
};

export function createDynamoDBConnectionTtlContext(
  options?: ApiOptions
): ConnectionTtlContext {
  const sessionDuration = new SessionDuration(
    options?.sessions?.webSocket ?? {
      duration: 3 * 60 * 60, // 3 hours
      refreshThreshold: 1 / 3, // 1 hour
    }
  );

  return {
    defaultTtl: sessionDuration.new.bind(sessionDuration),
    tryRefreshTtl: sessionDuration.tryRefresh.bind(sessionDuration),
  };
}
