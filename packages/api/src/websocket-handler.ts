import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { PingPongContextParams } from '~lambda-graphql/context/pingpong';
import { Connection } from '~lambda-graphql/dynamodb/models/connection';
import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
import { createLogger, Logger } from '~utils/logging';

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
import { CookiesMongoDBDynamoDBAuthenticationService } from './services/auth/auth-service';
import { SessionsCookie } from './services/http/sessions-cookie';
import { SessionDuration } from './services/session/duration';
import {
  ConnectionCustomData,
  parseConnectionCustomData,
  serializeConnectionCustomData,
} from './utils/connection-custom-data';
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
    requestDidStart({ event, context }) {
      const eventType = event.requestContext.eventType;
      const connectionId = event.requestContext.connectionId;

      const isConnectionDeleteEvent = eventType === 'DISCONNECT';

      let ws:
        | {
            connection: Connection;
            customData: ConnectionCustomData;
            isAuthModelModified: boolean;
          }
        | undefined;

      return {
        async createGraphQLContext() {
          if (!mongoDB) {
            mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
              createDefaultMongoDBContext(logger));
          }
          const mongoDBLoaders = createMongoDBLoaders(mongoDB);

            const connection = await context.loaders.connections.get({
              id: connectionId,
            });

          if (!connection) {
            throw new Error(
              'Cannot invoke createGraphQLContext since connection is missing'
            );
          }

          ws = {
            connection,
            customData: parseConnectionCustomData(connection.customData),
            isAuthModelModified: false,
          };
          if (!isConnectionDeleteEvent) {
            // Remember if auth model is modified, update connection before response is sent
            ws.customData.authenticatedContexts.eventBus.on('*', () => {
              if (!ws) {
                return;
              }

              ws.isAuthModelModified = true;
            });
          }

          // Cookies, Sessions
          const sessionsCookie = new SessionsCookie(
            {
              model: ws.customData.sessionsCookie,
            },
            {
              key: apiOptions.sessions?.cookieKey,
            }
          );

          // Auth Service
          const authService = new CookiesMongoDBDynamoDBAuthenticationService(
            {
              mongoDB: {
                ...mongoDB,
                loaders: mongoDBLoaders,
              },
              sessionsCookie,
            },
            ws.customData.authenticatedContexts
          );

          return {
            logger: options?.override?.gqlContextLogger ?? createLogger('ws-gql-context'),
            mongoDB: {
              ...mongoDB,
              loaders: mongoDBLoaders,
            },
            services: {
              auth: authService,
            },
            // pub and services
            options: apiOptions,
            connectionId,
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
          // event type pass it along?
          if (!isConnectionDeleteEvent && ws?.isAuthModelModified) {
            await context.models.connections.update(
              {
                id: ws.connection.id,
              },
              {
                customData: serializeConnectionCustomData(ws.customData),
              }
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
