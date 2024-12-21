import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createInitializeHandler,
  CreateInitializeHandlerOptions,
} from '~api/initialize-handler';
import { createLogger } from '~utils/logging';

import { createMockMongoDBContext } from '../parameters';

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
