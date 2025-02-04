import {
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql/index.js';
import {
  ConnectionInitMessage,
  Message,
  MessageType,
  PingMessage,
  PongMessage,
  validateMessage,
} from 'graphql-ws';
import { Logger } from '~utils/logging';
import { MaybePromise } from '~utils/types';

import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQLContext } from './context/graphql';
import {
  PingPongContext,
  PingPongContextParams,
  createPingPongContext,
} from './context/pingpong';
import { CompletedSubscriptionTable } from './dynamodb/models/completed-subscription';
import { ConnectionTable, ConnectionTtlContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { FormatError, FormatErrorOptions } from './graphql/format-unknown-error';
import { createCompleteHandler } from './messages/complete';
import { createConnectionInitHandler } from './messages/connection_init';
import { createPingHandler } from './messages/ping';
import { createPongHandler } from './messages/pong';
import { createSubscribeHandler } from './messages/subscribe';
import { Publisher } from './pubsub/publish';
import { createObjectLoader, ObjectLoader } from './dynamodb/loader';

interface DirectParams<TGraphQLContext> {
  readonly connection: ConnectionTtlContext;
  readonly completedSubscription: {
    readonly ttl: number;
  };
  readonly logger: Logger;

  /**
   *
   * @returns Connection if it was modified
   */
  readonly onConnectionInit?: (args: {
    context: WebSocketMessageHandlerEventContext<TGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: ConnectionInitMessage;
  }) => MaybePromise<void>;
  readonly onPing?: (args: {
    context: WebSocketMessageHandlerEventContext<TGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PingMessage;
  }) => MaybePromise<void>;
  readonly onPong?: (args: {
    context: WebSocketMessageHandlerEventContext<TGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PongMessage;
  }) => MaybePromise<void>;
  readonly onError?: (args: {
    error: unknown;
    context: WebSocketMessageHandlerEventContext<TGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<void>;
  readonly formatError?: FormatError;
  readonly formatErrorOptions?: FormatErrorOptions;
  readonly requestDidStart: (args: {
    readonly context: WebSocketMessageHandlerPreEventContext<TGraphQLContext>;
    readonly event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<{
    readonly createGraphQLContext: () => MaybePromise<TGraphQLContext>;
    readonly willSendResponse?: (response: APIGatewayProxyResultV2) => void;
  }>;
}

export interface WebSocketMessageHandlerParams<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  pingpong?: PingPongContextParams;
}

export interface WebSocketMessageHandlerContext<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable;
    subscriptions: SubscriptionTable;
    completedSubscription: CompletedSubscriptionTable;
  };
  socketApi: WebSocketApi;
  startPingPong?: PingPongContext['startPingPong'];
  messageHandlers: MessageHandlers<TGraphQLContext>;
  formatError: FormatError;
}

export interface WebSocketMessageHandlerEventContext<TGraphQLContext>
  extends WebSocketMessageHandlerContext<TGraphQLContext> {
  loaders: {
    connections: ObjectLoader<ConnectionTable, 'get'>;
    subscriptions: ObjectLoader<
      SubscriptionTable,
      'get' | 'queryAllByConnectionId' | 'queryAllByTopic' | 'queryAllByTopicFilter'
    >;
  };
}

type WebSocketMessageHandlerPreEventContext<TGraphQLContext> = Omit<
  WebSocketMessageHandlerEventContext<TGraphQLContext>,
  'createGraphQLContext'
>;

export interface WebSocketMessageGraphQLContext {
  readonly logger: Logger;
  readonly publish: Publisher;
}

export type WebSocketMessageHandler<T = never> = Handler<
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2<T>
>;

const defaultResponse: APIGatewayProxyResultV2 = {
  statusCode: 200,
};

export type MessageHandler<T extends MessageType, TGraphQLContext = unknown> = (args: {
  context: WebSocketMessageHandlerEventContext<TGraphQLContext>;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

export type MessageHandlers<TGraphQLContext = unknown> = Record<
  MessageType,
  MessageHandler<MessageType, TGraphQLContext>
>;

export function createMessageHandlers<
  TGraphQLContext = unknown,
>(): MessageHandlers<TGraphQLContext> {
  return {
    [MessageType.ConnectionInit]: createConnectionInitHandler(),
    [MessageType.Subscribe]: createSubscribeHandler<TGraphQLContext>(),
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
}

export function createWebSocketMessageHandler<TGraphQLContext>(
  params: WebSocketMessageHandlerParams<TGraphQLContext>
): WebSocketMessageHandler {
  const { logger } = params;

  logger.info('createWebSocketMessageHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDBContext(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);
  const pingpong = params.pingpong ? createPingPongContext(params.pingpong) : undefined;

  const context: WebSocketMessageHandlerContext<TGraphQLContext> = {
    ...params,
    formatError: params.formatError ?? ((err) => err),
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
      completedSubscription: dynamoDB.completedSubscriptions,
    },
    socketApi: apiGateway.socketApi,
    startPingPong: pingpong?.startPingPong,
    messageHandlers: createMessageHandlers<TGraphQLContext>(),
  };

  return webSocketMessageHandler<TGraphQLContext>(context);
}

export function webSocketMessageHandler<TGraphQLContext>(
  handlerContext: WebSocketMessageHandlerContext<TGraphQLContext>
): WebSocketMessageHandler {
  const messageHandlers = handlerContext.messageHandlers;

  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'MESSAGE') {
        throw new Error(`Invalid event type. Expected MESSAGE but is ${eventType}`);
      }
      const message = validateMessage(event.body != null ? JSON.parse(event.body) : null);

      handlerContext.logger.info('event:MESSAGE', {
        connectionId,
        type: message.type,
      });

      if (!(message.type in messageHandlers)) {
        throw new Error(`Unsupported message type ${message.type}`);
      }

      const messageHandler = messageHandlers[message.type];

      const preEventContext: WebSocketMessageHandlerPreEventContext<TGraphQLContext> = {
        ...handlerContext,
        loaders: {
          connections: createObjectLoader(handlerContext.models.connections, ['get']),
          subscriptions: createObjectLoader(handlerContext.models.subscriptions, [
            'get',
            'queryAllByConnectionId',
            'queryAllByTopic',
            'queryAllByTopicFilter',
          ]),
        },
      };

      const { createGraphQLContext, willSendResponse } =
        await handlerContext.requestDidStart({
          context: preEventContext,
          event,
        });

      const eventContext: WebSocketMessageHandlerEventContext<TGraphQLContext> = {
        ...preEventContext,
        createGraphQLContext,
      };

      let result: APIGatewayProxyResultV2;
      try {
        result =
          (await messageHandler({
            context: eventContext,
            event,
            message,
          })) ?? defaultResponse;
      } catch (err) {
        await handlerContext.onError?.({
          error: err,
          context: eventContext,
          event,
        });
        await handlerContext.socketApi.delete(event.requestContext);
      }

      result = defaultResponse;

      willSendResponse?.(result);

      return result;
    } catch (err) {
      handlerContext.logger.error('event:MESSAGE', { err, event });
      throw err;
    }
  };
}
