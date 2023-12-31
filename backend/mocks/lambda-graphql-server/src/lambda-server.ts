import { createServer } from 'http';

import { APIGatewayProxyHandler, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

import { Logger } from '~common/logger';
import { WebSocketConnectHandler } from '~lambda-graphql/connect-handler';
import { WebSocketDisconnectHandler } from '~lambda-graphql/disconnect-handler';

import { apiGatewayProxyHandlerMiddleware } from './handler/lambda-middleware';
import { apiGatewayProxyWebSocketHandler } from './handler/lambda-websocket';

export function createLambdaServer({
  sockets,
  apolloHttpHandler,
  connectHandler,
  messageHandler,
  disconnectHandler,
  httpUrl,
  wsUrl,
  logger,
}: {
  sockets: Record<string, WebSocket>;
  apolloHttpHandler: APIGatewayProxyHandler;
  connectHandler: WebSocketConnectHandler;
  messageHandler: APIGatewayProxyWebsocketHandlerV2;
  disconnectHandler: WebSocketDisconnectHandler;
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
    connectHandler,
    messageHandler,
    disconnectHandler,
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
