import 'source-map-support/register.js';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createScheduledHandler,
  CreateScheduledHandlerOptions,
} from '~api/scheduled-handler';
import { createLogger } from '~utils/logging';

import { createMockMongoDBContext } from '../parameters';

export function mockCreateScheduledHandlerOptions(): CreateScheduledHandlerOptions {
  return {
    override: {
      logger: createLogger('mock:scheduled-handler'),
      createMongoDBContext: createMockMongoDBContext,
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createScheduledHandler(
  mockCreateScheduledHandlerOptions()
);
