import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';

import { Logger } from '../../utils/src/logging';

import { MaybePromise } from '../../utils/src/types';

import { lowercaseHeaderKeys } from './apigateway-proxy-event/lowercase-header-keys';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import {
  Connection,
  ConnectionTable,
  ConnectionTtlContext,
} from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';

interface DirectParams<TGraphQLContext> {
  readonly connection: ConnectionTtlContext;
  readonly logger: Logger;

  // always have access to custom data when needed? and can modify it?

  /**
   *
   * @returns Additional GraphQL context used in resolvers.
   * Context is persisted in DynamoDB connection table while connection is alive.
   * Throw error to disconnect.
   */
  readonly onConnect?: (args: {
    context: WebSocketConnectHandlerContext<TGraphQLContext>;
    event: WebSocketConnectEvent;
    /**
     * Connection that will be stored in DynamoDB.
     */
    connection: Connection;
  }) => MaybePromise<void>;
}

export interface WebSocketConnectHandlerParams<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  readonly dynamoDB: DynamoDBContextParams;
}

export interface WebSocketConnectHandlerContext<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  readonly models: {
    readonly connections: ConnectionTable;
    readonly subscriptions: SubscriptionTable;
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

export function createWebSocketConnectHandler<TGraphQLContext>(
  params: WebSocketConnectHandlerParams<TGraphQLContext>
): WebSocketConnectHandler {
  const { logger } = params;

  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDBContext(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<TGraphQLContext> = {
    ...params,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
  };

  return webSocketConnectHandler(context);
}

export function webSocketConnectHandler<TGraphQLContext>(
  context: WebSocketConnectHandlerContext<TGraphQLContext>
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

      const connection: Connection = {
        id: connectionId,
        createdAt: Date.now(),
        requestContext: event.requestContext,
        hasPonged: false,
        ttl: context.connection.defaultTtl(),
      };

      await context.onConnect?.({
        context,
        event,
        connection,
      });

      await context.models.connections.put(connection);

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
