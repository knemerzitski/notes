import { MongoClient } from 'mongodb';

import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { WebSocketMessageHandlerParams } from '~lambda-graphql/message-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { MongoDBCollections } from '../mongodb/collections';

import { ApiOptions } from './api-options';
import {
  AuthenticationContext,
  SerializedAuthenticationContext,
  isAuthenticated,
  parseAuthFromHeaders,
  parseAuthenticationContextValue,
  serializeAuthenticationContext,
} from './auth-context';
import CookiesContext, { SerializedCookiesContext } from './cookies-context';
import NotesDataSource from './note/datasource/notes-datasource';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseGraphQLContext = {
  cookies: CookiesContext;
  auth: AuthenticationContext;
};

/**
 * Must only contain primitive values so it can be marshalled properly into
 * DynamoDB entry.
 * Class instances are not supported.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DynamoDBBaseGraphQLContext = {
  cookies: SerializedCookiesContext;
  auth: SerializedAuthenticationContext;
};

export interface ApiGraphQLContext {
  datasources: {
    notes: NotesDataSource;
  };
  mongodb: {
    client: MongoClient;
    collections: MongoDBCollections;
  };
  options?: ApiOptions;
}

export type GraphQLResolversContext = ApolloHttpGraphQLContext &
  BaseGraphQLContext &
  ApiGraphQLContext &
  SubscriptionContext;

/**
 * This type is used to define everything that websocket-graphql-handlers don't
 * define by default.
 *
 * ApiGraphQLContext
 * mongodb
 * datasources
 *
 * ApolloHttpGraphQLContext
 * request
 * response
 * publish
 *
 */
export type BaseSubscriptionResolversContext = Omit<
  GraphQLResolversContext,
  keyof BaseGraphQLContext | keyof SubscriptionContext
>;

export function createErrorBaseSubscriptionResolversContext(
  name = 'websocket-handler'
): Omit<BaseSubscriptionResolversContext, 'logger'> {
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
    get datasources() {
      return createErrorProxy('datasources') as ApiGraphQLContext['datasources'];
    },
    get mongodb() {
      return createErrorProxy('mongodb') as ApiGraphQLContext['mongodb'];
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

export function serializeBaseGraphQLContext(
  context: BaseGraphQLContext
): DynamoDBBaseGraphQLContext {
  return {
    ...context,
    cookies: context.cookies.serialize(),
    auth: serializeAuthenticationContext(context.auth),
  };
}

export function parseDynamoDBBaseGraphQLContext(
  value: DynamoDBBaseGraphQLContext | undefined
) {
  return {
    auth: parseAuthenticationContextValue(value?.auth),
    cookies: new CookiesContext({
      sessions: value?.cookies.sessions ?? {},
    }),
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

  const newAuth = await parseAuthFromHeaders(
    headers,
    cookies,
    context.graphQLContext.mongodb.collections
  );

  if (!isAuthenticated(newAuth)) return;

  return serializeBaseGraphQLContext({
    ...restCtx,
    auth: newAuth,
    cookies: cookies,
  });
};
