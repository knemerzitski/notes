import WebSocket from 'ws';

import { createMongooseContext } from '~api/context/mongoose';
import {
  createDefaultGraphQLParams,
  createDefaultSubscriptionGraphQLParams,
} from '~api/handler-params';
import mongooseSchema from '~api/schema/mongooseSchema';
import { createLogger } from '~common/logger';
import { ApiGatewayContextParams } from '~lambda-graphql/context/apigateway';
import { DynamoDBContextParams } from '~lambda-graphql/context/dynamodb';
import { GraphQLContextParams } from '~lambda-graphql/context/graphql';
import { PingPongContextParams } from '~lambda-graphql/context/pingpong';
import { createPingPongHandler } from '~lambda-graphql/ping-pong-handler';

import { MockApiGatewayManagementApiClient } from './utils/mock-apigatewaymanagementapi';
import { MockPingPongSFNClient } from './utils/mock-pingpong-sfnclient';

export function createMockGraphQLParams<TContext>(): GraphQLContextParams<TContext> {
  return createDefaultGraphQLParams<TContext>(createLogger('mock:graphql-http'));
}

export function createMockSubscriptionGraphQLParams<
  TContext,
>(): GraphQLContextParams<TContext> {
  return createDefaultSubscriptionGraphQLParams<TContext>(
    createLogger('mock:graphql-ws')
  );
}

export async function createMockMongooseContext() {
  if (!process.env.MOCK_MONGODB_URI) {
    throw new Error('Environment variable "MOCK_MONGODB_URI" must be defined');
  }

  return await createMongooseContext({
    logger: createLogger('mock:mongodb'),
    schema: mongooseSchema,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    uri: process.env.MOCK_MONGODB_URI,
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
  sockets: Record<string, WebSocket>
): ApiGatewayContextParams {
  return {
    logger: createLogger('mock:apigateway'),
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
