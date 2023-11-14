import { createServer } from 'http';

import { Logger } from '@/utils/logger';
import { APIGatewayProxyHandler, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

import { proxyEventApolloMiddleware } from './handlers/proxyEventApolloMiddleware';
import { webSocketSubscriptionHandler } from './handlers/webSocketSubscriptionHandler';
import { createDynamoDbTables } from './utils/createDynamoDbTables';

export async function createLambdaGraphQlServer({
  handlerContext,
  httpUrl,
  wsUrl,
  logger,
}: {
  handlerContext: {
    sockets: Record<string, WebSocket>;
    httpRequestHandler: APIGatewayProxyHandler;
    webSocketHandler: APIGatewayProxyWebsocketHandlerV2;
  };
  httpUrl: URL;
  wsUrl: URL;
  logger: Logger;
}) {
  if (wsUrl.port != httpUrl.port) {
    logger.warning(
      'WS URL port is different from HTTP URL port. WS URL port is ignored. Instead HTTP URL port is used.',
      {
        httpUrl,
        wsUrl,
      }
    );
  }

  const app = express();
  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: wsUrl.pathname,
  });

  if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
    throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
  }

  await createDynamoDbTables({
    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    logger,
  });

  wsServer.on('listening', () => {
    logger.info('wsServer:listening', { wsUrl: wsUrl.toString() });
  });
  wsServer.on(
    'connection',
    webSocketSubscriptionHandler({
      sockets: handlerContext.sockets,
      handler: handlerContext.webSocketHandler,
      logger,
    })
  );

  app.use(
    httpUrl.pathname,
    cors<cors.CorsRequest>(),
    bodyParser.text({
      type: 'application/json',
    }),
    proxyEventApolloMiddleware({
      logger,
      handler: handlerContext.httpRequestHandler,
    })
  );

  httpServer.listen(httpUrl.port, () => {
    logger.info('http:listening', { httpUrl: httpUrl.toString() });
  });

  return {
    stop() {
      httpServer.close();
    },
  };
}
