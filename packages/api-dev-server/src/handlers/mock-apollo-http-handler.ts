import 'source-map-support/register.js';
import WebSocket from 'ws';

import {
  CreateApolloHttpHandlerDefaultParamsOptions,
  createApolloHttpHandlerDefaultParams,
} from '~api/apollo-http-handler';
import { createApolloHttpHandler } from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logging';

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
