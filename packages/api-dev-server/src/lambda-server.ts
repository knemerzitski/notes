import { createServer } from 'http';

import { APIGatewayProxyHandler } from 'aws-lambda';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '~utils/logging';

import { apiGatewayProxyHandlerMiddleware } from './api-gateway/express-middleware-handler';
import {
  MergedOrRoutedWebSocketHandler,
  apiGatewayProxyWebSocketHandler,
} from './api-gateway/websocket-handler';

export function createLambdaServer({
  sockets,
  apolloHttpHandler,
  webSocketHandler,
  httpUrl,
  wsUrl,
  logger,
}: {
  sockets: Record<string, WebSocket>;
  apolloHttpHandler: APIGatewayProxyHandler;
  webSocketHandler: MergedOrRoutedWebSocketHandler;
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

  wsServer.on('listening', () => {
    logger.info('wsServer:listening', { wsUrl: wsUrl.toString() });
  });

  const webSocketConnectionHandler = apiGatewayProxyWebSocketHandler({
    sockets,
    handler: webSocketHandler,
    logger,
  });

  wsServer.on('connection', (ws, msg) => {
    void (async () => {
      await webSocketConnectionHandler(ws, msg);
    })();
  });

  app.use(
    httpUrl.pathname,
    cors(),
    bodyParser.text({
      type: 'application/json',
    }),
    apiGatewayProxyHandlerMiddleware({
      logger,
      handler: apolloHttpHandler,
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
