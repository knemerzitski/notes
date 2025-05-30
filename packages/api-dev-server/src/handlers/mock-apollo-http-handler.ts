import 'source-map-support/register.js';
import WebSocket from 'ws';

import {
  createApolloHttpHandlerDefaultParams,
  CreateApolloHttpHandlerDefaultParamsOptions,
} from '../../../api/src/apollo-http-handler';
import { createApolloHttpHandler } from '../../../lambda-graphql/src/apollo-http-handler';
import { createLogger } from '../../../utils/src/logging';

import {
  createMockGraphQLParams,
  createMockMongoDBContext,
  createMockDynamoDBParams,
  createMockApiGatewayParams,
} from '../parameters';

export interface MockCreateApolloHttpHandlerDefaultParamsOptions {
  sockets?: Record<string, WebSocket>;
}

export function mockApolloHttpHandlerDefaultParamsOptions(
  options?: MockCreateApolloHttpHandlerDefaultParamsOptions
): CreateApolloHttpHandlerDefaultParamsOptions {
  return {
    override: {
      logger: createLogger('mock:apollo-http-handler'),
      createMongoDBContext: createMockMongoDBContext,
      createGraphQLParams: createMockGraphQLParams,
      createDynamoDBParams: createMockDynamoDBParams,
      createApiGatewayParams: () => createMockApiGatewayParams(options?.sockets),
    },
  };
}

export const handler = createApolloHttpHandler(
  createApolloHttpHandlerDefaultParams(mockApolloHttpHandlerDefaultParamsOptions())
);
