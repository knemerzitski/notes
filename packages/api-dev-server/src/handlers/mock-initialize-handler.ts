import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import { createLogger } from '~utils/logger';

import { createMockMongoDBContext } from '../parameters';
import {
  createInitializeHandler,
  CreateInitializeHandlerOptions,
} from '~api/initialize-handler';

export interface MockWebSocketHandlerDefaultParamsOptions {
  sockets?: Record<string, WebSocket>;
}

export function mockCreateInitializeHandlerOptions(): CreateInitializeHandlerOptions {
  return {
    override: {
      logger: createLogger('mock:initialize-handler'),
      createMongoDBContext: createMockMongoDBContext,
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createInitializeHandler(
  mockCreateInitializeHandlerOptions()
);
