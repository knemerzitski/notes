import { createHandler as createApolloHttpRequestHandler } from '@/apolloHttpRequestHandler';
import { ApiGatewayContextConfig } from '@/context/apiGateway';
import { DynamoDbContextConfig } from '@/context/dynamoDb';
import { createHandler as createWebSocketSubscriptionHandler } from '@/webSocketSubscriptionHandler';
import { mongooseSchema } from '@/schema/mongoose-schema';
import { queryMutationResolvers, subscriptionResolvers } from '@/schema/resolvers';
import typeDefs from '@/schema/typedefs.graphql';
import { createLogger } from '@/utils/logger';
import { WebSocket } from 'ws';

import { MockApiGatewayManagementApiClient } from '../utils/MockApiGatewayManagementApiClient';

export function createEnvLambdaHandlers() {
  const sockets: Record<string, WebSocket> = {};

  if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
    throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
  }

  const dynamoDb: DynamoDbContextConfig = {
    logger: createLogger('mock:dynamodb'),
    clientConfig: {
      region: 'eu-west-1',
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: 'dummykey123',
        secretAccessKey: 'dummysecretkey123',
      },
    },
    tableNames: {
      connections: 'connections',
      subscriptions: 'subscriptions',
    },
  };

  const apiGateway: ApiGatewayContextConfig = {
    logger: createLogger('mock:apigateway'),
    newClient() {
      return new MockApiGatewayManagementApiClient(sockets);
    },
  };

  if (!process.env.MOCK_MONGODB_URI) {
    throw new Error('Environment variable "MOCK_MONGODB_URI" must be defined');
  }

  const httpRequestHandler = createApolloHttpRequestHandler({
    logger: createLogger('mock:apollo-http-request-handler'),
    graphQl: {
      logger: createLogger('mock:graphql-http'),
      typeDefs,
      resolvers: queryMutationResolvers,
    },
    mongoDb: {
      logger: createLogger('mock:mongodb'),
      schema: mongooseSchema,
      uri: process.env.MOCK_MONGODB_URI,
    },
    dynamoDb,
    apiGateway,
  });

  const webSocketHandler = createWebSocketSubscriptionHandler({
    logger: createLogger('mock:websocket-subscription-handler'),
    graphQl: {
      logger: createLogger('mock:graphql-ws'),
      typeDefs,
      resolvers: subscriptionResolvers,
    },
    dynamoDb,
    apiGateway,
    defaultTtl() {
      return Math.floor(Date.now() / 1000) + 1 * 60 * 60;
    },
  });

  return {
    sockets,
    httpRequestHandler,
    webSocketHandler,
  };
}
