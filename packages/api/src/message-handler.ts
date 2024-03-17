import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketMessageHandler,
  WebSocketMessageHandlerParams,
} from '~lambda-graphql/message-handler';
import { createLogger } from '~utils/logger';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
} from './graphql/context';
import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongooseContext,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';

export function createDefaultParams(): WebSocketMessageHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
> {
  const name = 'ws-message-handler';
  const logger = createLogger(name);

  let mongoose: Awaited<ReturnType<typeof createDefaultMongooseContext>> | undefined;

  return {
    connection: createDefaultDynamoDBConnectionTtlContext(),
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
    graphQl: createDefaultSubscriptionGraphQLParams(logger),
    async createGraphQLContext() {
      if (!mongoose) {
        mongoose = await createDefaultMongooseContext(logger);
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(name),
        logger: createLogger('ws-message-gql-context'),
        mongoose,
      };
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketMessageHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext
>(createDefaultParams());
