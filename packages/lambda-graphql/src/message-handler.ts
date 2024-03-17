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
import { GraphQLContextParams, createGraphQlContext } from './context/graphql';
import {
  PingPongContext,
  PingPongContextParams,
  createPingPongContext,
} from './context/pingpong';
import {
  ConnectionTable,
  ConnectionTtlContext,
  OnConnectGraphQLContext,
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
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> {
  connection: ConnectionTtlContext;
  logger: Logger;

  onConnectionInit?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: ConnectionInitMessage;
  }) => MaybePromise<void>;
  onPing?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PingMessage;
  }) => MaybePromise<void>;
  onPong?: (args: {
    context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
    message: PongMessage;
  }) => MaybePromise<void>;
  onError?: (args: {
    error: unknown;
    context: WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<void>;
}

export interface WebSocketMessageHandlerParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  createGraphQLContext: (
    context: WebSocketMessageHandlerContextWithoutGraphQLContext<
      TGraphQLContext,
      TOnConnectGraphQLContext
    >,
    event: APIGatewayProxyWebsocketEventV2
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  graphQl: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  pingpong?: PingPongContextParams;
}

export interface WebSocketMessageHandlerContext<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable<TOnConnectGraphQLContext>;
  };
  socketApi: WebSocketApi;
  startPingPong?: PingPongContext['startPingPong'];
}

export interface WebSocketMessageGraphQLContext {
  readonly logger: Logger;
  readonly publish: Publisher;
}

type WebSocketMessageHandlerContextWithoutGraphQLContext<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> = Omit<
  WebSocketMessageHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>,
  'graphQLContext'
>;

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

export function createMessageHandlers<
  TGraphQLContext = unknown,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext = OnConnectGraphQLContext,
>(): MessageHandlers<TGraphQLContext, TOnConnectGraphQLContext> {
  return {
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
}

export function createWebSocketMessageHandler<
  TGraphQLContext extends WebSocketMessageGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: WebSocketMessageHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>
): WebSocketMessageHandler {
  const { logger } = params;

  logger.info('createWebSocketMessageHandler');

  const graphQl = createGraphQlContext(params.graphQl);
  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);
  const pingpong = params.pingpong ? createPingPongContext(params.pingpong) : undefined;

  const context: WebSocketMessageHandlerContextWithoutGraphQLContext<
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
    startPingPong: pingpong?.startPingPong,
  };

  return webSocketMessageHandler<TGraphQLContext, TOnConnectGraphQLContext>(
    params,
    context,
    createMessageHandlers<TGraphQLContext, TOnConnectGraphQLContext>()
  );
}

export function webSocketMessageHandler<
  TGraphQLContext extends WebSocketMessageGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  {
    createGraphQLContext,
  }: Pick<
    WebSocketMessageHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>,
    'createGraphQLContext'
  >,
  context: WebSocketMessageHandlerContextWithoutGraphQLContext<
    TGraphQLContext,
    TOnConnectGraphQLContext
  >,
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

      const partialGraphQLContext: TGraphQLContext & {
        publish?: TGraphQLContext['publish'];
      } = {
        ...(await createGraphQLContext(context, event)),
      };

      const isCurrentConnection = (id: string) => connectionId === id;
      partialGraphQLContext.publish = createPublisher<
        Omit<TGraphQLContext, 'publish'>,
        TOnConnectGraphQLContext
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
