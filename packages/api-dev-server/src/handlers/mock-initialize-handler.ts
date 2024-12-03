import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import WebSocket from 'ws';

import {
  createInitializeHandler,
  CreateInitializeHandlerOptions,
} from '~api/initialize-handler';
import { createLogger } from '~utils/logging';

import { createMockMongoDBContext } from '../parameters';

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
