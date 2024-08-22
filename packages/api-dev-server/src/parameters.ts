import WebSocket from 'ws';
import { createCollectionInstances } from '~api/mongodb/collections';
import { createMongoDBContext } from '~api/mongodb/lambda-context';
import { ApiGatewayContextParams } from '~lambda-graphql/context/apigateway';
import { DynamoDBContextParams } from '~lambda-graphql/context/dynamodb';
import {
  ApolloGraphQLContextParams,
  GraphQLContextParams,
} from '~lambda-graphql/context/graphql';
import { PingPongContextParams } from '~lambda-graphql/context/pingpong';
import { createPingPongHandler } from '~lambda-graphql/ping-pong-handler';
import { createLogger } from '~utils/logger';

import {
  MockApiGatewayManagementApiClient,
  MockEmtpyApiGatewayManagementApiClient,
} from './api-gateway/mock-apigatewaymanagementapi';
import { MockPingPongSFNClient } from './pingpong/mock-pingpong-sfnclient';
import {
  createDefaultGraphQLParams,
  createDefaultSubscriptionGraphQLParams,
} from '~api/parameters';

export function createMockGraphQLParams<
  TContext extends object,
>(): ApolloGraphQLContextParams<TContext> {
  return createDefaultGraphQLParams<TContext>(createLogger('mock:graphql-http'));
}

export function createMockSubscriptionGraphQLParams<
  TContext,
>(): GraphQLContextParams<TContext> {
  return createDefaultSubscriptionGraphQLParams<TContext>(
    createLogger('mock:graphql-ws')
  );
}

export async function createMockMongoDBContext() {
  if (!process.env.MOCK_MONGODB_URI) {
    throw new Error('Environment variable "MOCK_MONGODB_URI" must be defined');
  }

  const timeout = 2000;

  return await createMongoDBContext({
    logger: createLogger('mock:mongodb'),
    createCollectionInstances,
    uri: process.env.MOCK_MONGODB_URI,
    options: {
      connectTimeoutMS: timeout,
      socketTimeoutMS: timeout,
      waitQueueTimeoutMS: timeout,
      serverSelectionTimeoutMS: timeout,
    },
  });
}

export function createMockDynamoDBParams(): DynamoDBContextParams {
  if (!process.env.MOCK_DYNAMODB_ENDPOINT) {
    throw new Error('Environment variable "MOCK_DYNAMODB_ENDPOINT" must be defined');
  }

  return {
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
}

export function createMockApiGatewayParams(
  sockets?: Record<string, WebSocket>
): ApiGatewayContextParams {
  const logger = createLogger('mock:apigateway');

  if (!sockets) {
    logger.warning(
      'Created without providing sockets. WebSocket subscriptions will not work.'
    );
    return {
      logger,
      newClient() {
        return new MockEmtpyApiGatewayManagementApiClient();
      },
    };
  }

  return {
    logger,
    newClient() {
      return new MockApiGatewayManagementApiClient(sockets);
    },
  };
}

export function createMockPingPongParams(
  sockets: Record<string, WebSocket>
): PingPongContextParams {
  const delay = 60;
  const timeout = 10;
  const logger = createLogger('mock:pingpong');

  const handler = createPingPongHandler({
    apiGateway: createMockApiGatewayParams(sockets),
    dynamoDB: createMockDynamoDBParams(),
    logger,
    pingpong: {
      delay,
      timeout,
    },
  });

  return {
    delay,
    timeout,
    logger,
    stateMachineArn: 'dummy-machine-arn',
    newClient() {
      return new MockPingPongSFNClient(handler, logger);
    },
  };
}
