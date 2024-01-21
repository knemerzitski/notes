import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import {
  APIGatewayEventWebsocketRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda';
import { WebSocket } from 'ws';

import {
  WebSocketConnectEventEvent,
  WebSocketConnectHandler,
} from '~lambda-graphql/connect-handler';
import { WebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';
import { isArray } from '~utils/isArray';
import { Logger } from '~utils/logger';

import fixtureWebSocketEventConnect from '../../fixtures/websocket/CONNECT.json';
import fixtureWebSocketEventDisconnect from '../../fixtures/websocket/DISCONNECT.json';
import fixtureWebSocketEventMessage from '../../fixtures/websocket/MESSAGE.json';
import { createLambdaContext } from '../utils/lambda-context';

export function apiGatewayProxyWebSocketHandler({
  sockets,
  logger,
  connectHandler,
  messageHandler,
  disconnectHandler,
}: {
  connectHandler: WebSocketConnectHandler;
  messageHandler: APIGatewayProxyWebsocketHandlerV2;
  disconnectHandler: WebSocketDisconnectHandler;
  sockets: Record<string, WebSocket>;
  logger: Logger;
}) {
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
      const event: WebSocketConnectEventEvent = {
        ...createWebSocketEvent(id, 'CONNECT'),
        headers: Object.fromEntries(
          Object.entries(msg.headers).map(([key, value]) => [
            key,
            isArray(value) ? value[0] : value,
          ])
        ),
        multiValueHeaders: msg.headersDistinct,
      };

      await connectHandler(event, createLambdaContext(), () => {
        return;
      });
    } catch (err) {
      logger.error('handler:CONNECT', err as Error);
      sockets[id]?.close();
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
