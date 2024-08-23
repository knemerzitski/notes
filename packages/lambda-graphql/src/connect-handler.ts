import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';
import { Logger } from '~utils/logger';
import { Maybe, MaybePromise } from '~utils/types';

import { lowercaseHeaderKeys } from './apigateway-proxy-event/lowercase-header-keys';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import {
  ConnectionTable,
  ConnectionTtlContext,
  DynamoDBRecord,
} from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';

interface DirectParams<
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> {
  connection: ConnectionTtlContext;
  logger: Logger;

  /**
   *
   * @returns Additional GraphQL context used in resolvers.
   * Context is persisted in DynamoDB connection table while connection is alive.
   * Throw error to disconnect.
   */
  onConnect?: (args: {
    context: WebSocketConnectHandlerContext<TBaseGraphQLContext, TDynamoDBGraphQLContext>;
    event: WebSocketConnectEvent;
  }) => Maybe<MaybePromise<TDynamoDBGraphQLContext>>;
  parseDynamoDBGraphQLContext: (
    value: TDynamoDBGraphQLContext | undefined
  ) => TBaseGraphQLContext;
}

export interface WebSocketConnectHandlerParams<
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketConnectHandlerContext<
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  models: {
    connections: ConnectionTable<TDynamoDBGraphQLContext>;
    subscriptions: SubscriptionTable<TDynamoDBGraphQLContext>;
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

export function createWebSocketConnectHandler<
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  params: WebSocketConnectHandlerParams<TBaseGraphQLContext, TDynamoDBGraphQLContext>
): WebSocketConnectHandler {
  const { logger } = params;

  logger.info('createWebSocketConnectHandler');

  const dynamoDB = createDynamoDbContext<TDynamoDBGraphQLContext>(params.dynamoDB);

  const context: WebSocketConnectHandlerContext<
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  > = {
    ...params,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
  };

  return webSocketConnectHandler(context);
}

export function webSocketConnectHandler<
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  context: WebSocketConnectHandlerContext<TBaseGraphQLContext, TDynamoDBGraphQLContext>
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

      const dynamoDBGraphQLContext = await context.onConnect?.({ context, event });

      await context.models.connections.put({
        id: connectionId,
        createdAt: Date.now(),
        requestContext: event.requestContext,
        graphQLContext: dynamoDBGraphQLContext ?? undefined,
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

      return Promise.resolve(response);
    } catch (err) {
      context.logger.error('event:CONNECT', err as Error, { event });
      throw err;
    }
  };
}
