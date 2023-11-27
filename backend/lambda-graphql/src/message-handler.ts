import {
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql';
import { Message, MessageType, validateMessage } from 'graphql-ws';

import { Logger } from '~common/logger';

import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQlContext } from './context/graphql';
import { ConnectionTable } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { createCompleteHandler } from './messages/complete';
import { createConnectionInitHandler } from './messages/connection_init';
import { createPingHandler } from './messages/ping';
import { createPongHandler } from './messages/pong';
import { createSubscribeHandler } from './messages/subscribe';

export interface WebSocketMessageHandlerParams<TGraphQLContext> {
  graphQl: GraphQLContextParams<TGraphQLContext>;
  graphQLContext: TGraphQLContext;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  logger: Logger;
}

export interface WebSocketMessageHandlerContext<
  TGraphQLContext,
  TOnConnectGraphQLContext,
> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
  socketApi: WebSocketApi;
  logger: Logger;
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
  TOnConnectGraphQLContext = unknown,
> = (args: {
  context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

export type MessageHandlers<
  TGraphQLContext = unknown,
  TOnConnectGraphQLContext = unknown,
> = Record<
  MessageType,
  MessageHandler<MessageType, TGraphQLContext, TOnConnectGraphQLContext>
>;

export function createWebSocketMessageHandler<TGraphQLContext, TOnConnectGraphQLContext>(
  params: WebSocketMessageHandlerParams<TGraphQLContext>
): WebSocketMessageHandler {
  const logger = params.logger;
  logger.info('createWebSocketMessageHandler');

  const graphQl = createGraphQlContext(params.graphQl);
  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: WebSocketMessageHandlerContext<
    TGraphQLContext,
    TOnConnectGraphQLContext
  > = {
    schema: graphQl.schema,
    graphQLContext: params.graphQLContext,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
    logger: logger,
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

export function webSocketMessageHandler<TGraphQLContext, TOnConnectGraphQLContext>(
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
