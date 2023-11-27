import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';

import { Logger } from '~common/logger';

import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { ConnectionTable } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';

export interface WebSocketConnectHandlerParams<TOnConnectGraphQLContext> {
  dynamoDB: DynamoDBContextParams;
  createConnectionGraphQLContext: (
    context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Promise<TOnConnectGraphQLContext> | TOnConnectGraphQLContext;
  defaultTtl: () => number;
  logger: Logger;
}

export interface WebSocketConnectHandlerContext<TOnConnectGraphQLContext> {
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
  createConnectionGraphQLContext: (
    context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Promise<TOnConnectGraphQLContext> | TOnConnectGraphQLContext;
  defaultTtl: () => number;
  logger: Logger;
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

export function createWebSocketConnectHandler<TOnConnectGraphQLContext>(
  params: WebSocketConnectHandlerParams<TOnConnectGraphQLContext>
): WebSocketConnectHandler {
  const logger = params.logger;
  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<TOnConnectGraphQLContext> = {
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    createConnectionGraphQLContext: params.createConnectionGraphQLContext,
    defaultTtl: params.defaultTtl,
    logger: logger,
  };

  return webSocketConnectHandler(context);
}

export function webSocketConnectHandler<TOnConnectGraphQLContext>(
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

      // TODO trigger event onConnect?

      await context.models.connections.put({
        id: connectionId,
        createdAt: Date.now(),
        requestContext: event.requestContext,
        onConnectgraphQLContext: await context.createConnectionGraphQLContext(
          context,
          event
        ),
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
