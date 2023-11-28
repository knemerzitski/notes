import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';

import { Logger } from '~common/logger';
import { Maybe, MaybePromise } from '~common/types';

import { WebSocketConnectEventEvent } from './connect-handler';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { ConnectionTable, OnConnectGraphQLContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';

interface DirectParams<TOnConnectGraphQLContext extends OnConnectGraphQLContext> {
  logger: Logger;

  onDisconnect?: (args: {
    context: WebSocketDisconnectHandlerContext<TOnConnectGraphQLContext>;
    event: WebSocketConnectEventEvent;
  }) => Maybe<MaybePromise<TOnConnectGraphQLContext>>;
}

export interface WebSocketDisconnectHandlerParams<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TOnConnectGraphQLContext> {
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketDisconnectHandlerContext<
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
export type WebSocketDisconnectEventEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: APIGatewayProxyEventHeaders;
  multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
};

export type WebSocketDisconnectHandler<T = never> = Handler<
  WebSocketDisconnectEventEvent,
  APIGatewayProxyResultV2<T>
>;

const defaultResponse: APIGatewayProxyResultV2 = {
  statusCode: 200,
};

export function createWebSocketDisconnectHandler<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: WebSocketDisconnectHandlerParams<TOnConnectGraphQLContext>
): WebSocketDisconnectHandler {
  const { logger } = params;
  logger.info('createWebSocketDisconnectHandler');

  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);

  const context: WebSocketDisconnectHandlerContext<TOnConnectGraphQLContext> = {
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    logger: logger,
  };

  return webSocketDisconnectHandler(context);
}

export function webSocketDisconnectHandler<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  context: WebSocketDisconnectHandlerContext<TOnConnectGraphQLContext>
): WebSocketDisconnectHandler {
  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'DISCONNECT') {
        throw new Error(`Invalid event type. Expected DISCONNECT but is ${eventType}`);
      }

      context.logger.info('event:DISCONNECT', {
        connectionId,
      });

      context.logger.info('messages:disconnect:onDisconnect', {
        onDisconnect: !!context.onDisconnect,
      });
      await context.onDisconnect?.({ context, event });

      const connectionSubscriptions =
        await context.models.subscriptions.queryAllByConnectionId(connectionId);

      const deletions = connectionSubscriptions.map(async (sub) => {
        // TODO trigger subscribe onComplete?

        await context.models.subscriptions.delete({ id: sub.id });
      });

      await context.models.connections.delete({ id: connectionId });

      await Promise.all(deletions);

      return Promise.resolve(defaultResponse);
    } catch (err) {
      context.logger.error('event:DISCONNECT', err as Error, { event });
      throw err;
    }
  };
}