import { randomUUID } from 'crypto';

import { Logger } from '@/utils/logger';
import {
  APIGatewayEventWebsocketRequestContextV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda';
import { WebSocket } from 'ws';

import apiGatewayProxyWebsocketEventV2Fixture from '../../fixtures/apiGatewayProxyWebsocketEventV2.json';
import { createLambdaContext } from '../utils/createLambdaContext';

export function webSocketSubscriptionHandler({
  sockets,
  logger,
  handler,
}: {
  handler: APIGatewayProxyWebsocketHandlerV2;
  sockets: Record<string, WebSocket>;
  logger: Logger;
}) {
  return async (ws: WebSocket) => {
    const id = randomUUID();
    sockets[id] = ws;

    logger.info('wsServer:connection', {
      id,
    });

    ws.on('message', async (data) => {
      // try {
      //   logger.info('ws:message', { data: JSON.parse(data.toString()) });
      // } catch (err) {
      //   logger.error('ws:message:parseError', err as Error);
      // }
      try {
        await handler(
          createApiGatewayProxyWebSocketEventV2(id, 'MESSAGE', data.toString()),
          createLambdaContext(),
          () => {}
        );
      } catch (err) {
        logger.error('handler:MESSAGE', err as Error);
      }
    });

    ws.on('error', (err) => {
      logger.error('ws:error', err, { id });
    });

    ws.on('close', async () => {
      logger.info('ws:close', {
        id,
      });
      try {
        await handler(
          createApiGatewayProxyWebSocketEventV2(id, 'DISCONNECT'),
          createLambdaContext(),
          () => {}
        );
      } catch (err) {
        logger.error('handler:DISCONNECT', err as Error);
      }

      delete sockets[id];
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
      await handler(
        createApiGatewayProxyWebSocketEventV2(id, 'CONNECT'),
        createLambdaContext(),
        () => {}
      );
    } catch (err) {
      logger.error('handler:CONNECT', err as Error);
      delete sockets[id];
    }
  };
}

function createApiGatewayProxyWebSocketEventV2(
  connectionId: APIGatewayEventWebsocketRequestContextV2['connectionId'],
  eventType: APIGatewayEventWebsocketRequestContextV2['eventType'],
  message?: APIGatewayProxyWebsocketEventV2['body']
): APIGatewayProxyWebsocketEventV2 {
  const eventCopy: typeof apiGatewayProxyWebsocketEventV2Fixture = JSON.parse(
    JSON.stringify(apiGatewayProxyWebsocketEventV2Fixture)
  );
  return {
    ...eventCopy,
    body: message,
    requestContext: {
      ...eventCopy.requestContext,
      eventType,
      connectionId,
      messageDirection: 'IN',
    },
  };
}
