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
import { PersistGraphQLContext } from './types';

interface DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  readonly connection: ConnectionTtlContext;
  readonly completedSubscription: {
    readonly ttl: number;
  };
  readonly logger: Logger;

  readonly onConnectionInit?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: ConnectionInitMessage;
    persistGraphQLContext: TPersistGraphQLContext;
  }) => MaybePromise<TPersistGraphQLContext | void>;
  readonly onPing?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PingMessage;
  }) => MaybePromise<void>;
  readonly onPong?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PongMessage;
  }) => MaybePromise<void>;
  readonly onError?: (args: {
    error: unknown;
    context: WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<void>;
  readonly formatError?: FormatError;
  readonly formatErrorOptions?: FormatErrorOptions;
  readonly persistGraphQLContext: PersistGraphQLContext<
    TGraphQLContext,
    TPersistGraphQLContext
  >;
}

export interface WebSocketMessageHandlerParams<TGraphQLContext, TPersistGraphQLContext>
  extends DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  createGraphQLContext: (
    context: Omit<
      WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>,
      'graphQLContext' | 'createGraphQLContext'
    >,
    event: APIGatewayProxyWebsocketEventV2
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  pingpong?: PingPongContextParams;
}

export interface WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>
  extends DirectParams<TGraphQLContext, TPersistGraphQLContext> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable;
    subscriptions: SubscriptionTable;
    completedSubscription: CompletedSubscriptionTable;
  };
  socketApi: WebSocketApi;
  startPingPong?: PingPongContext['startPingPong'];
  messageHandlers: MessageHandlers<TGraphQLContext, TPersistGraphQLContext>;
  formatError: FormatError;
  createGraphQLContext: WebSocketMessageHandlerParams<
    TGraphQLContext,
    TPersistGraphQLContext
  >['createGraphQLContext'];
}

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

export type MessageHandler<
  T extends MessageType,
  TGraphQLContext = unknown,
  TPersistGraphQLContext = unknown,
> = (args: {
  context: WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

export type MessageHandlers<
  TGraphQLContext = unknown,
  TPersistGraphQLContext = unknown,
> = Record<
  MessageType,
  MessageHandler<MessageType, TGraphQLContext, TPersistGraphQLContext>
>;

export function createMessageHandlers<
  TGraphQLContext = unknown,
  TPersistGraphQLContext = unknown,
>(): MessageHandlers<TGraphQLContext, TPersistGraphQLContext> {
  return {
    [MessageType.ConnectionInit]: createConnectionInitHandler(),
    [MessageType.Subscribe]: createSubscribeHandler<
      TGraphQLContext,
      TPersistGraphQLContext
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
}

export function createWebSocketMessageHandler<
  TGraphQLContext extends Omit<WebSocketMessageGraphQLContext, 'publish'>,
  TPersistGraphQLContext,
>(
  params: WebSocketMessageHandlerParams<TGraphQLContext, TPersistGraphQLContext>
): WebSocketMessageHandler {
  const { logger } = params;

  logger.info('createWebSocketMessageHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDBContext(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);
  const pingpong = params.pingpong ? createPingPongContext(params.pingpong) : undefined;

  const context: Omit<
    WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>,
    'graphQLContext'
  > = {
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
    messageHandlers: createMessageHandlers<TGraphQLContext, TPersistGraphQLContext>(),
  };

  return webSocketMessageHandler<TGraphQLContext, TPersistGraphQLContext>(context);
}

export function webSocketMessageHandler<
  TGraphQLContext extends Omit<WebSocketMessageGraphQLContext, 'publish'>,
  TPersistGraphQLContext,
>(
  context: Omit<
    WebSocketMessageHandlerContext<TGraphQLContext, TPersistGraphQLContext>,
    'graphQLContext'
  >
): WebSocketMessageHandler {
  const messageHandlers = context.messageHandlers;

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

      const graphQLContext: TGraphQLContext = await context.createGraphQLContext(
        context,
        event
      );

      const messageHandler = messageHandlers[message.type];

      try {
        return (
          (await messageHandler({
            context: {
              ...context,
              graphQLContext,
            },
            event,
            message,
          })) ?? defaultResponse
        );
      } catch (err) {
        await context.onError?.({
          error: err,
          context: {
            ...context,
            graphQLContext,
          },
          event,
        });
        await context.socketApi.delete(event.requestContext);
      }

      return defaultResponse;
    } catch (err) {
      context.logger.error('event:MESSAGE', { err, event });
      throw err;
    }
  };
}
