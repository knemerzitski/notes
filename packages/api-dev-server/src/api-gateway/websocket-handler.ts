import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import {
  APIGatewayEventWebsocketRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda';
import { WebSocket } from 'ws';

import {
  WebSocketConnectEvent,
  WebSocketConnectHandler,
} from '~lambda-graphql/connect-handler';
import { WebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';
import { WebSocketHandler } from '~lambda-graphql/websocket-handler';
import { isArray } from '~utils/array/is-array';
import { Logger } from '~utils/logger';

import fixtureWebSocketEventConnect from '../../fixtures/websocket/CONNECT.json';
import fixtureWebSocketEventDisconnect from '../../fixtures/websocket/DISCONNECT.json';
import fixtureWebSocketEventMessage from '../../fixtures/websocket/MESSAGE.json';
import { createLambdaContext } from '../utils/lambda-context';

type AllHandler = WebSocketHandler;
interface RoutedHandlers {
  connect: WebSocketConnectHandler;
  message: APIGatewayProxyWebsocketHandlerV2;
  disconnect: WebSocketDisconnectHandler;
}

export type MergedOrRoutedWebSocketHandler = AllHandler | RoutedHandlers;

function isRoutedHandlers(
  handler: MergedOrRoutedWebSocketHandler
): handler is RoutedHandlers {
  return typeof handler !== 'function';
}

export function apiGatewayProxyWebSocketHandler({
  handler,
  sockets,
  logger,
}: {
  handler: MergedOrRoutedWebSocketHandler;
  sockets: Record<string, WebSocket>;
  logger: Logger;
}) {
  let connectHandler: WebSocketConnectHandler;
  let messageHandler: APIGatewayProxyWebsocketHandlerV2;
  let disconnectHandler: WebSocketDisconnectHandler;
  if (isRoutedHandlers(handler)) {
    connectHandler = handler.connect;
    messageHandler = handler.message;
    disconnectHandler = handler.disconnect;
  } else {
    connectHandler = handler;
    messageHandler = handler;
    disconnectHandler = handler;
  }

  return async (ws: WebSocket, msg: IncomingMessage) => {
    const id = randomUUID();
    sockets[id] = ws;

    logger.info('wsServer:connection', {
      id,
    });

    ws.on('message', (data) => {
      void (async () => {
        try {
          await messageHandler(
            createWebSocketEvent(id, 'MESSAGE', String(data)),
            createLambdaContext(),
            () => {
              return;
            }
          );
        } catch (err) {
          logger.error('handler:MESSAGE', err as Error);
        }
      })();
    });

    ws.on('error', (err) => {
      logger.error('ws:error', err, { id });
    });

    ws.on('close', () => {
      void (async () => {
        logger.info('ws:close', {
          id,
        });
        try {
          await disconnectHandler(
            createWebSocketEvent(id, 'DISCONNECT'),
            createLambdaContext(),
            () => {
              return;
            }
          );
        } catch (err) {
          logger.error('handler:DISCONNECT', err as Error);
        }

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete sockets[id];
      })();
    });

    ws.on('ping', () => {
      logger.info('ws:ping', {
        id,
      });
    });

    ws.on('pong', () => {
      logger.info('ws:ping', {
        id,
      });
    });

    ws.on('unexpected-response', (data) => {
      logger.info('ws:unexpected-response', { id, data });
    });

    ws.on('close', (ws) => {
      logger.info('ws:close', { id, ws });
    });

    try {
      const event: WebSocketConnectEvent = {
        ...createWebSocketEvent(id, 'CONNECT'),
        headers: Object.fromEntries(
          Object.entries(msg.headers).map(([key, value]) => [
            key,
            isArray(value) ? value[0] : value,
          ])
        ),
        multiValueHeaders: msg.headersDistinct,
      };

      const res = await connectHandler(event, createLambdaContext(), () => {
        return;
      });

      // Send custom message for e2e testing. This signals that connection_init message can be sent.
      ws.send(
        JSON.stringify({
          type: 'connected',
          payload: res,
        })
      );
    } catch (err) {
      logger.error('handler:CONNECT', err as Error);
      sockets[id].close();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete sockets[id];
    }
  };
}

function createWebSocketEvent(
  connectionId: APIGatewayEventWebsocketRequestContextV2['connectionId'],
  eventType: APIGatewayEventWebsocketRequestContextV2['eventType'],
  message?: APIGatewayProxyWebsocketEventV2['body']
): APIGatewayProxyWebsocketEventV2 {
  let fixture;
  if (eventType === 'CONNECT') {
    fixture = fixtureWebSocketEventConnect;
  } else if (eventType === 'DISCONNECT') {
    fixture = fixtureWebSocketEventMessage;
  } else {
    fixture = fixtureWebSocketEventDisconnect;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const eventCopy: typeof fixture = JSON.parse(JSON.stringify(fixture));

  return {
    ...eventCopy,
    body: message,
    requestContext: {
      messageId: 'abcd1234',
      ...eventCopy.requestContext,
      eventType,
      connectionId,
      messageDirection: 'IN',
    },
  };
}
