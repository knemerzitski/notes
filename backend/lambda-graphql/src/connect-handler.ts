import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';

import { Logger } from '~common/logger';
import { Maybe, MaybePromise } from '~common/types';

import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { ConnectionTable, OnConnectGraphQLContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';

interface DirectParams<TOnConnectGraphQLContext extends OnConnectGraphQLContext> {
  defaultTtl: () => number;
  logger: Logger;

  onConnect?: (
    context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Maybe<MaybePromise<TOnConnectGraphQLContext>>;
}

export interface WebSocketConnectHandlerParams<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TOnConnectGraphQLContext> {
  dynamoDB: DynamoDBContextParams;

  /**
   *
   * @returns Additional GraphQL context used in resolvers.
   * Context is persisted in DynamoDB connection table while connection is alive.
   * Throw error to disconnect.
   */
  onConnect?: (
    context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Maybe<MaybePromise<TOnConnectGraphQLContext>>;
}

export interface WebSocketConnectHandlerContext<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TOnConnectGraphQLContext> {
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
}

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketConnectEventEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: APIGatewayProxyEventHeaders;
  multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
};

export type WebSocketConnectHandler<T = never> = Handler<
  WebSocketConnectEventEvent,
  APIGatewayProxyResultV2<T>
>;

export function createWebSocketConnectHandler<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: WebSocketConnectHandlerParams<TOnConnectGraphQLContext>
): WebSocketConnectHandler {
  const { logger } = params;

  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext> = {
    ...params,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
  };

  return webSocketConnectHandler(context);
}

export function webSocketConnectHandler<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext>
): WebSocketConnectHandler {
  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'CONNECT') {
        throw new Error(`Invalid event type. Expected CONNECT but is ${eventType}`);
      }

      context.logger.info('event:CONNECT', {
        connectionId,
        headers: event.headers,
      });

      const onConnectGraphQLContext = await context.onConnect?.(context, event);

      await context.models.connections.put({
        id: connectionId,
        createdAt: Date.now(),
        requestContext: event.requestContext,
        onConnectGraphQLContext,
        ttl: context.defaultTtl(),
      });

      return Promise.resolve({
        statusCode: 200,
        headers: {
          'Sec-Websocket-Protocol': GRAPHQL_TRANSPORT_WS_PROTOCOL,
        },
      });
    } catch (err) {
      context.logger.error('event:CONNECT', err as Error, { event });
      throw err;
    }
  };
}
