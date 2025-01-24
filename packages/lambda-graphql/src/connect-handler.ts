import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';
import { Logger } from '~utils/logging';
import { Maybe, MaybePromise } from '~utils/types';

import { lowercaseHeaderKeys } from './apigateway-proxy-event/lowercase-header-keys';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import { ConnectionTable, ConnectionTtlContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { PersistGraphQLContext } from './types';

interface DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  connection: ConnectionTtlContext;
  logger: Logger;

  /**
   *
   * @returns Additional GraphQL context used in resolvers.
   * Context is persisted in DynamoDB connection table while connection is alive.
   * Throw error to disconnect.
   */
  onConnect?: (args: {
    context: WebSocketConnectHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
    event: WebSocketConnectEvent;
  }) => Maybe<MaybePromise<TPersistGraphQLContext>>;
  persistGraphQLContext: Pick<
    PersistGraphQLContext<TGraphQLContext, TPersistGraphQLContext>,
    'serialize'
  >;
}

export interface WebSocketConnectHandlerParams<TGraphQLContext, TPersistGraphQLContext>
  extends DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketConnectHandlerContext<TGraphQLContext, TPersistGraphQLContext>
  extends DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  models: {
    connections: ConnectionTable;
    subscriptions: SubscriptionTable;
  };
}

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketConnectEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: APIGatewayProxyEventHeaders;
  multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
};

export type WebSocketConnectHandler<T = never> = Handler<
  WebSocketConnectEvent,
  APIGatewayProxyResultV2<T>
>;

export function createWebSocketConnectHandler<TGraphQLContext, TPersistGraphQLContext>(
  params: WebSocketConnectHandlerParams<TGraphQLContext, TPersistGraphQLContext>
): WebSocketConnectHandler {
  const { logger } = params;

  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDBContext(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<TGraphQLContext, TPersistGraphQLContext> =
    {
      ...params,
      models: {
        connections: dynamoDB.connections,
        subscriptions: dynamoDB.subscriptions,
      },
    };

  return webSocketConnectHandler(context);
}

export function webSocketConnectHandler<TGraphQLContext, TPersistGraphQLContext>(
  context: WebSocketConnectHandlerContext<TGraphQLContext, TPersistGraphQLContext>
): WebSocketConnectHandler {
  return async (event) => {
    try {
      event.headers = event.headers ? lowercaseHeaderKeys(event.headers) : event.headers;

      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'CONNECT') {
        throw new Error(`Invalid event type. Expected CONNECT but is ${eventType}`);
      }

      context.logger.info('event:CONNECT', {
        connectionId,
        headers: event.headers,
      });

      const persistGraphQLContext = await context.onConnect?.({ context, event });

      await context.models.connections.put({
        id: connectionId,
        createdAt: Date.now(),
        requestContext: event.requestContext,
        persistGraphQLContext:
          context.persistGraphQLContext.serialize(persistGraphQLContext),
        hasPonged: false,
        ttl: context.connection.defaultTtl(),
      });

      const response = {
        statusCode: 200,
        headers: {
          'Sec-Websocket-Protocol': GRAPHQL_TRANSPORT_WS_PROTOCOL,
        },
      };

      context.logger.info('event:CONNECT', {
        response,
      });

      return response;
    } catch (err) {
      context.logger.error('event:CONNECT', { err, event });
      throw err;
    }
  };
}
