import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { PingPongContextParams } from '../../lambda-graphql/src/context/pingpong';

import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '../../lambda-graphql/src/websocket-handler';

import { Logger, createLogger } from '../../utils/src/logging';

import { formatError } from './graphql/errors';
import { WebSocketHandlerGraphQLResolversContext } from './graphql/types';
import { createMongoDBLoaders } from './mongodb/loaders';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
  createDefaultSubscriptionGraphQLParams,
} from './parameters';
import { SessionDuration } from './services/session/duration';
import { ConnectionsAuthenticationServiceCache } from './utils/auth-cache';
import { serializeConnectionCustomData } from './utils/connection-custom-data';
import { createErrorProxy } from './utils/error-proxy';
import { onConnect } from './utils/on-connect';
import { onConnectionInit } from './utils/on-connection-init';

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
): WebSocketHandlerParams<WebSocketHandlerGraphQLResolversContext> {
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
    pingpong: options?.pingPongParams,
    connection: (() => {
      const sessionDuration = new SessionDuration(
        apiOptions.sessions?.webSocket ?? {
          duration: 1000 * 60 * 60 * 3, // 3 hours
          refreshThreshold: 1 / 3, // 1 hour
        }
      );

      return {
        defaultTtl: sessionDuration.new.bind(sessionDuration),
        tryRefreshTtl: sessionDuration.tryRefresh.bind(sessionDuration),
      };
    })(),
    completedSubscription: {
      ttl: apiOptions.completedSubscriptions.duration ?? 1000 * 5, // 5 seconds
    },
    onConnect,
    onConnectionInit,
    async requestDidStart({ event, context }) {
      const eventType = event.requestContext.eventType;
      const requestConnectionId = event.requestContext.connectionId;

      const isConnectionDeleteEvent = eventType === 'DISCONNECT';

      // MongoDB
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }
      const mongoDBContext = {
        ...mongoDB,
        loaders: createMongoDBLoaders(mongoDB),
      };

      const authCache = new ConnectionsAuthenticationServiceCache({
        connections: context.loaders.connections,
        mongoDB: mongoDBContext,
        apiOptions,
      });

      return {
        async createGraphQLContext(graphQLContextConnectionId = requestConnectionId) {
          const authService = await authCache.get(graphQLContextConnectionId);

          return {
            logger: options?.override?.gqlContextLogger ?? createLogger('ws-gql-context'),
            mongoDB: mongoDBContext,
            services: {
              auth: authService,
            },
            // pub and services
            options: apiOptions,
            connectionId: graphQLContextConnectionId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            get request() {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return createErrorProxy('request', name);
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            get response() {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return createErrorProxy('response', name);
            },
          };
        },
        async willSendResponse() {
          if (!isConnectionDeleteEvent) {
            await Promise.allSettled(
              authCache.changedCustomDatas.map(({ connectionId, customData }) =>
                context.models.connections.update(
                  {
                    id: connectionId,
                  },
                  {
                    customData: serializeConnectionCustomData(customData),
                  }
                )
              )
            );
          }
        },
      };
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler(
  createWebSocketHandlerDefaultParams()
);
