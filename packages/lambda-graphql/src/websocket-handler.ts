/**
 * Merged functionality of connect, message and disconnect handler
 */

import {
  APIGatewayProxyWebsocketEventV2,
  Handler,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import {
  WebSocketConnectEvent,
  WebSocketConnectHandlerContext,
  WebSocketConnectHandlerParams,
  webSocketConnectHandler,
} from './connect-handler';
import { createApiGatewayContext } from './context/apigateway';
import { createDynamoDBContext } from './context/dynamodb';
import { createGraphQLContext } from './context/graphql';
import { createPingPongContext } from './context/pingpong';
import {
  WebSocketDisconnectEvent,
  WebSocketDisconnectGraphQLContext,
  WebSocketDisconnectHandlerContext,
  WebSocketDisconnectHandlerParams,
  webSocketDisconnectHandler,
} from './disconnect-handler';
import {
  WebSocketMessageGraphQLContext,
  WebSocketMessageHandlerContext,
  WebSocketMessageHandlerParams,
  createMessageHandlers,
  webSocketMessageHandler,
} from './message-handler';

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketEvent = WebSocketConnectEvent &
  APIGatewayProxyWebsocketEventV2 &
  WebSocketDisconnectEvent;

export type WebSocketHandler<T = never> = Handler<
  WebSocketEvent,
  APIGatewayProxyResultV2<T>
>;

export type WebSocketHandlerParams<TGraphQLContext> =
  WebSocketConnectHandlerParams<TGraphQLContext> &
    WebSocketMessageHandlerParams<TGraphQLContext> &
    WebSocketDisconnectHandlerParams<TGraphQLContext>;

export type WebSocketHandlerContext<TGraphQLContext> =
  WebSocketConnectHandlerContext<TGraphQLContext> &
    WebSocketMessageHandlerContext<TGraphQLContext> &
    WebSocketDisconnectHandlerContext<TGraphQLContext> & {
      eventHandlers: ReturnType<typeof createEventHandlers>;
    };

export type WebSocketGraphQLContext = WebSocketMessageGraphQLContext &
  WebSocketDisconnectGraphQLContext;

export function createEventHandlers<TGraphQLContext>(
  context: Omit<
    WebSocketHandlerContext<TGraphQLContext>,
    'graphQLContext' | 'eventHandlers'
  >
) {
  return {
    CONNECT: webSocketConnectHandler(context),
    MESSAGE: webSocketMessageHandler(context),
    DISCONNECT: webSocketDisconnectHandler(context),
  };
}

export function createWebSocketHandler<TGraphQLContext>(
  params: WebSocketHandlerParams<TGraphQLContext>
): WebSocketHandler {
  const { logger } = params;

  logger.info('createWebSocketHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDBContext(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);
  const pingpong = params.pingpong ? createPingPongContext(params.pingpong) : undefined;

  const context: Omit<
    WebSocketHandlerContext<TGraphQLContext>,
    'graphQLContext' | 'eventHandlers'
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
    messageHandlers: createMessageHandlers<TGraphQLContext>(),
  };

  const eventHandlers = createEventHandlers(context);

  return webSocketHandler({
    ...context,
    eventHandlers,
  });
}

export function webSocketHandler<TGraphQLContext>(
  context: Omit<WebSocketHandlerContext<TGraphQLContext>, 'graphQLContext'>
): WebSocketHandler {
  return (event, requestContext, callback) => {
    const { eventType } = event.requestContext;
    const eventHandler = context.eventHandlers[eventType];
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!eventHandler) {
        throw new Error(
          `Unsupported event type. Expected CONNECT, MESSAGE or DISCONNECT but is ${eventType}`
        );
      }
    } catch (err) {
      context.logger.error('event:MESSAGE', { err, event });
      throw err;
    }

    return eventHandler(event, requestContext, callback);
  };
}
