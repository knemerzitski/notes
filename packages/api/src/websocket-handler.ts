import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { PingPongContextParams } from '~lambda-graphql/context/pingpong';
import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
import { createLogger, Logger } from '~utils/logging';

import {
  createApiGraphQLContext,
  createPersistGraphQLContext,
  mergePersistGraphQLContext,
  parsePersistGraphQLContext,
  serializePersistGraphQLContext,
} from './graphql/context';
import { formatError } from './graphql/errors';
import {
  ApiGraphQLContext,
  PersistGraphQLContext,
  BaseSubscriptionResolversContext,
} from './graphql/types';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
  createDefaultSubscriptionGraphQLParams,
} from './parameters';
import {
  createErrorBaseSubscriptionResolversContext,
  createDynamoDBConnectionTtlContext,
  handleConnectionInitAuthenticate,
} from './utils/handlers';

export interface CreateWebSocketHandlerDefaultParamsOptions {
  override?: {
    logger?: Logger;
    gqlContextLogger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
    createDynamoDBParams?: typeof createDefaultDynamoDBParams;
    createApiGatewayParams?: typeof createDefaultApiGatewayParams;
    createDefaultSubscriptionGraphQLParams?: typeof createDefaultSubscriptionGraphQLParams;
  };
  pingPongParams?: PingPongContextParams;
}

export function createWebSocketHandlerDefaultParams(
  options?: CreateWebSocketHandlerDefaultParamsOptions
): WebSocketHandlerParams<BaseSubscriptionResolversContext, PersistGraphQLContext> {
  const name = 'ws-handler';
  const logger = options?.override?.logger ?? createLogger(name);

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    formatError,
    formatErrorOptions: {
      includeStacktrace: process.env.NODE_ENV === 'development',
    },
    graphQL:
      options?.override?.createDefaultSubscriptionGraphQLParams?.(logger) ??
      createDefaultSubscriptionGraphQLParams(logger),
    apiGateway:
      options?.override?.createApiGatewayParams?.(logger) ??
      createDefaultApiGatewayParams(logger),
    dynamoDB:
      options?.override?.createDynamoDBParams?.(logger) ??
      createDefaultDynamoDBParams(logger),

    onConnectionInit: handleConnectionInitAuthenticate,
    pingpong: options?.pingPongParams,
    persistGraphQLContext: {
      serialize: serializePersistGraphQLContext,
      parse: parsePersistGraphQLContext,
      merge: mergePersistGraphQLContext,
    },
    connection: createDynamoDBConnectionTtlContext(apiOptions),
    completedSubscription: {
      ttl: apiOptions.completedSubscriptions.duration ?? 1000 * 5, // 5 seconds
    },
    async onConnect({ event }) {
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }

      const apiContext: ApiGraphQLContext = {
        ...createApiGraphQLContext({
          mongoDB,
          options: apiOptions,
        }),
        connectionId: event.requestContext.connectionId,
      };

      return createPersistGraphQLContext({
        headers: event.headers,
        ctx: apiContext,
      });
    },

    async createGraphQLContext(_ctx, event) {
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }
      return {
        ...createErrorBaseSubscriptionResolversContext(name),
        logger: options?.override?.gqlContextLogger ?? createLogger('ws-gql-context'),
        ...createApiGraphQLContext({
          mongoDB,
          options: apiOptions,
        }),
        connectionId: event.requestContext.connectionId,
      };
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  PersistGraphQLContext
>(createWebSocketHandlerDefaultParams());
