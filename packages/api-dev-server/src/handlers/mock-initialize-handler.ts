import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  CreateInitializeHandlerOptions,
  createInitializeHandler,
} from '../../../api/src/initialize-handler';
import { createLogger } from '../../../utils/src/logging';

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
