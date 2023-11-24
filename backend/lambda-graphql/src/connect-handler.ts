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

export interface WebSocketConnectHandlerParams<TConnectionGraphQLContext> {
  dynamoDB: DynamoDBContextParams;
  createConnectionGraphQLContext: (
    context: WebSocketConnectHandlerContext<TConnectionGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Promise<TConnectionGraphQLContext> | TConnectionGraphQLContext;
  defaultTtl: () => number;
  logger: Logger;
}

export interface WebSocketConnectHandlerContext<TConnectionGraphQLContext> {
  models: {
    connections: ConnectionTable<TConnectionGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
  createConnectionGraphQLContext: (
    context: WebSocketConnectHandlerContext<TConnectionGraphQLContext>,
    event: WebSocketConnectEventEvent
  ) => Promise<TConnectionGraphQLContext> | TConnectionGraphQLContext;
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

export function createWebSocketConnectHandler<TConnectionGraphQLContext>(
  params: WebSocketConnectHandlerParams<TConnectionGraphQLContext>
): WebSocketConnectHandler {
  const logger = params.logger;
  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDbContext<TConnectionGraphQLContext>(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<TConnectionGraphQLContext> = {
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

export function webSocketConnectHandler<TConnectionGraphQLContext>(
  context: WebSocketConnectHandlerContext<TConnectionGraphQLContext>
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
        graphQLContext: await context.createConnectionGraphQLContext(context, event),
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
