import {
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql';
import {
  ConnectionInitMessage,
  Message,
  MessageType,
  PingMessage,
  PongMessage,
  validateMessage,
} from 'graphql-ws';
import { Logger } from '~utils/logger';
import { MaybePromise } from '~utils/types';

import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQLContext } from './context/graphql';
import {
  PingPongContext,
  PingPongContextParams,
  createPingPongContext,
} from './context/pingpong';
import {
  ConnectionTable,
  ConnectionTtlContext,
  DynamoDBRecord,
} from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { createCompleteHandler } from './messages/complete';
import { createConnectionInitHandler } from './messages/connection_init';
import { createPingHandler } from './messages/ping';
import { createPongHandler } from './messages/pong';
import { createSubscribeHandler } from './messages/subscribe';
import { Publisher, createPublisher } from './pubsub/publish';

interface DirectParams<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> {
  connection: ConnectionTtlContext;
  logger: Logger;

  onConnectionInit?: (args: {
    context: WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >;
    event: APIGatewayProxyWebsocketEventV2;
    message: ConnectionInitMessage;
    baseGraphQLContext: TBaseGraphQLContext;
  }) => MaybePromise<TDynamoDBGraphQLContext | void>;
  onPing?: (args: {
    context: WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >;
    event: APIGatewayProxyWebsocketEventV2;
    message: PingMessage;
  }) => MaybePromise<void>;
  onPong?: (args: {
    context: WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >;
    event: APIGatewayProxyWebsocketEventV2;
    message: PongMessage;
  }) => MaybePromise<void>;
  onError?: (args: {
    error: unknown;
    context: WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >;
    event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<void>;
  parseDynamoDBGraphQLContext: (
    value: TDynamoDBGraphQLContext | undefined
  ) => TBaseGraphQLContext;
}

export interface WebSocketMessageHandlerParams<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TGraphQLContext, TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  createGraphQLContext: (
    context: Omit<
      WebSocketMessageHandlerContext<
        TGraphQLContext,
        TBaseGraphQLContext,
        TDynamoDBGraphQLContext
      >,
      'graphQLContext' | 'createGraphQLContext'
    >,
    event: APIGatewayProxyWebsocketEventV2
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  pingpong?: PingPongContextParams;
}

export interface WebSocketMessageHandlerContext<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TGraphQLContext, TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable<TDynamoDBGraphQLContext>;
    subscriptions: SubscriptionTable<TDynamoDBGraphQLContext>;
  };
  socketApi: WebSocketApi;
  startPingPong?: PingPongContext['startPingPong'];
  messageHandlers: MessageHandlers<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >;
  createGraphQLContext: WebSocketMessageHandlerParams<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
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
  TBaseGraphQLContext = unknown,
  SerializedTOnConnectGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
> = (args: {
  context: WebSocketMessageHandlerContext<
    TGraphQLContext,
    TBaseGraphQLContext,
    SerializedTOnConnectGraphQLContext
  >;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

export type MessageHandlers<
  TGraphQLContext = unknown,
  TBaseGraphQLContext = unknown,
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
> = Record<
  MessageType,
  MessageHandler<
    MessageType,
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >
>;

export function createMessageHandlers<
  TGraphQLContext = unknown,
  TBaseGraphQLContext = unknown,
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
>(): MessageHandlers<TGraphQLContext, TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  return {
    [MessageType.ConnectionInit]: createConnectionInitHandler(),
    [MessageType.Subscribe]: createSubscribeHandler<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
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
  TGraphQLContext extends WebSocketMessageGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  params: WebSocketMessageHandlerParams<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >
): WebSocketMessageHandler {
  const { logger } = params;

  logger.info('createWebSocketMessageHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDbContext<TDynamoDBGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);
  const pingpong = params.pingpong ? createPingPongContext(params.pingpong) : undefined;

  const context: Omit<
    WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >,
    'graphQLContext'
  > = {
    ...params,
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
    startPingPong: pingpong?.startPingPong,
    messageHandlers: createMessageHandlers<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >(),
  };

  return webSocketMessageHandler<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >(context);
}

export function webSocketMessageHandler<
  TGraphQLContext extends WebSocketMessageGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  context: Omit<
    WebSocketMessageHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >,
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

      const partialGraphQLContext: TGraphQLContext & {
        publish?: TGraphQLContext['publish'];
      } = {
        ...(await context.createGraphQLContext(context, event)),
      };

      const isCurrentConnection = (id: string) => connectionId === id;
      partialGraphQLContext.publish = createPublisher<
        Omit<TGraphQLContext, 'publish'>,
        TDynamoDBGraphQLContext
      >({
        context: {
          ...context,
          graphQLContext: partialGraphQLContext,
        },
        isCurrentConnection,
      });

      const graphQLContext: TGraphQLContext = partialGraphQLContext;

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

      return Promise.resolve(defaultResponse);
    } catch (err) {
      context.logger.error('event:MESSAGE', err as Error, { event });
      throw err;
    }
  };
}
