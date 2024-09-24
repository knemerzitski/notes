import 'source-map-support/register';
import WebSocket from 'ws';

import {
  createApolloHttpHandler,
  ApolloHttpGraphQLContext,
} from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logging';

import {
  createMockGraphQLParams,
  createMockMongoDBContext,
  createMockDynamoDBParams,
  createMockApiGatewayParams,
} from '../parameters';
import {
  CreateApolloHttpHandlerDefaultParamsOptions,
  createApolloHttpHandlerDefaultParams,
} from '~api/apollo-http-handler';
import { DynamoDBBaseGraphQLContext, GraphQLResolversContext } from '~api/graphql/types';

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

export const handler = createApolloHttpHandler<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
>(createApolloHttpHandlerDefaultParams(mockApolloHttpHandlerDefaultParamsOptions()));
