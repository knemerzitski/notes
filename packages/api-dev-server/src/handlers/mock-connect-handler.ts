import 'source-map-support/register';
import { handleConnectGraphQLAuth } from '~api/connect-handler';
import {
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
  parseDynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import { createDefaultDynamoDBConnectionTtlContext } from '~api/handler-params';
import {
  WebSocketConnectHandlerParams,
  createWebSocketConnectHandler,
} from '~lambda-graphql/connect-handler';
import { createLogger } from '~utils/logger';

import { createMockDynamoDBParams, createMockMongoDBContext } from '../handler-params';

interface MockWebSocketConnectHandlerOptions {
  mongodb?: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockCreateDefaultParams(
  options?: MockWebSocketConnectHandlerOptions
): WebSocketConnectHandlerParams<BaseGraphQLContext, DynamoDBBaseGraphQLContext> {
  let mongodb = options?.mongodb;

  return {
    logger: createLogger('mock:ws-connect-handler'),
    connection: createDefaultDynamoDBConnectionTtlContext(),
    dynamoDB: createMockDynamoDBParams(),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return handleConnectGraphQLAuth(mongodb.collections, event);
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
  };
}

export const handler = createWebSocketConnectHandler<
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
