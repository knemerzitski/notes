import WebSocket from 'ws';

import {
  MongoDBCollections,
  createCollectionInstances,
} from '../../api/src/mongodb/collections';
import { createMongoDBContext } from '../../api/src/mongodb/context';
import {
  createDefaultGraphQLParams,
  createDefaultSubscriptionGraphQLParams,
} from '../../api/src/parameters';
import { ApiGatewayContextParams } from '../../lambda-graphql/src/context/apigateway';
import { DynamoDBContextParams } from '../../lambda-graphql/src/context/dynamodb';
import {
  ApolloGraphQLContextParams,
  GraphQLContextParams,
} from '../../lambda-graphql/src/context/graphql';
import { PingPongContextParams } from '../../lambda-graphql/src/context/pingpong';
import { createPingPongHandler } from '../../lambda-graphql/src/ping-pong-handler';
import { assertGetEnvironmentVariables } from '../../utils/src/env';
import { createLogger } from '../../utils/src/logging';
import { isEnvironmentVariableTruthy } from '../../utils/src/string/is-environment-variable-truthy';

import {
  MockApiGatewayManagementApiClient,
  MockEmtpyApiGatewayManagementApiClient,
} from './api-gateway/mock-apigatewaymanagementapi';
import { MockPingPongSFNClient } from './pingpong/mock-pingpong-sfnclient';

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

export async function createMockMongoDBContext(): ReturnType<
  typeof createMongoDBContext<MongoDBCollections>
> {
  const env = assertGetEnvironmentVariables(['MONGODB_URI']);

  const noDBMode = isEnvironmentVariableTruthy(process.env.NO_DB_MODE);
  if (noDBMode) {
    return new Proxy(
      {},
      {
        get() {
          return `Cannot use MongoDB. Server is running in NO_DB_MODE.`;
        },
      }
    ) as ReturnType<typeof createMongoDBContext<MongoDBCollections>>;
  }

  const timeout = 10000;

  return await createMongoDBContext({
    logger: createLogger('mock:mongodb'),
    createCollectionInstances,
    uri: env.MONGODB_URI,
    options: {
      connectTimeoutMS: timeout,
      socketTimeoutMS: timeout,
      waitQueueTimeoutMS: timeout,
      serverSelectionTimeoutMS: timeout,
      monitorCommands: true,
    },
  });
}

export function createMockDynamoDBParams(): DynamoDBContextParams {
  const env = assertGetEnvironmentVariables(['DYNAMODB_ENDPOINT']);

  return {
    logger: createLogger('mock:dynamodb'),
    clientConfig: {
      region: 'eu-west-1',
      endpoint: env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: 'dummykey123',
        secretAccessKey: 'dummysecretkey123',
      },
    },
    tableNames: {
      connections: 'connections',
      subscriptions: 'subscriptions',
      completedSubscriptions: 'completedSubscriptions',
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
