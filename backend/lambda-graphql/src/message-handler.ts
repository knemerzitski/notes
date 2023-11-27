import {
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql';
import { ConnectionInitMessage, Message, MessageType, validateMessage } from 'graphql-ws';

import { Logger } from '~common/logger';
import { MaybePromise } from '~common/types';

import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQlContext } from './context/graphql';
import { ConnectionTable, OnConnectGraphQLContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { createCompleteHandler } from './messages/complete';
import { createConnectionInitHandler } from './messages/connection_init';
import { createPingHandler } from './messages/ping';
import { createPongHandler } from './messages/pong';
import { createSubscribeHandler } from './messages/subscribe';

interface DirectParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> {
  graphQLContext: TGraphQLContext;
  logger: Logger;

  onConnectionInit?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: ConnectionInitMessage;
  }) => MaybePromise<void>;
}

export interface WebSocketMessageHandlerParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  graphQl: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
}

export interface WebSocketMessageHandlerContext<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
  socketApi: WebSocketApi;
}

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketMessageHandler<T = never> = Handler<
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2<T>
>;

const defaultResponse: APIGatewayProxyResultV2 = {
  statusCode: 200,
};

export type MessageHandler<
  T extends MessageType,
  TGraphQLContext = unknown,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext = OnConnectGraphQLContext,
> = (args: {
  context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

export type MessageHandlers<
  TGraphQLContext = unknown,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext = OnConnectGraphQLContext,
> = Record<
  MessageType,
  MessageHandler<MessageType, TGraphQLContext, TOnConnectGraphQLContext>
>;

export function createWebSocketMessageHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: WebSocketMessageHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>
): WebSocketMessageHandler {
  const { logger } = params;

  logger.info('createWebSocketMessageHandler');

  const graphQl = createGraphQlContext(params.graphQl);
  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: WebSocketMessageHandlerContext<
    TGraphQLContext,
    TOnConnectGraphQLContext
  > = {
    ...params,
    schema: graphQl.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
  };

  const messageHandlers: MessageHandlers<TGraphQLContext, TOnConnectGraphQLContext> = {
    [MessageType.ConnectionInit]: createConnectionInitHandler(),
    [MessageType.Subscribe]: createSubscribeHandler<
      TGraphQLContext,
      TOnConnectGraphQLContext
    >(),
    [MessageType.Complete]: createCompleteHandler(),
    [MessageType.Ping]: createPingHandler(),
    [MessageType.Pong]: createPongHandler(),
    [MessageType.ConnectionAck]: () => {
      throw new Error('Unsupported message type ConnectionAck');
    },
    [MessageType.Next]: () => {
      throw new Error('Unsupported message type Next');
    },
    [MessageType.Error]: () => {
      throw new Error('Unsupported message type Error');
    },
  };

  return webSocketMessageHandler<TGraphQLContext, TOnConnectGraphQLContext>(
    context,
    messageHandlers
  );
}

export function webSocketMessageHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>,
  messageHandlers: MessageHandlers<TGraphQLContext, TOnConnectGraphQLContext>
): WebSocketMessageHandler {
  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'MESSAGE') {
        throw new Error(`Invalid event type. Expected MESSAGE but is ${eventType}`);
      }
      const message = validateMessage(event.body != null ? JSON.parse(event.body) : null);

      context.logger.info('event:MESSAGE', {
        connectionId,
        type: message.type,
      });

      if (!(message.type in messageHandlers)) {
        throw new Error(`Unsupported message type ${message.type}`);
      }

      const messageHandler = messageHandlers[message.type];

      try {
        return (await messageHandler({ context, event, message })) ?? defaultResponse;
      } catch (err) {
        await context.socketApi.delete(event.requestContext);
        // TODO trigger event onError?
      }

      return Promise.resolve(defaultResponse);
    } catch (err) {
      context.logger.error('event:MESSAGE', err as Error, { event });
      throw err;
    }
  };
}
