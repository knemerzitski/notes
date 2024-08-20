import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
import { createLogger } from '~utils/logger';

import { handleConnectGraphQLAuth } from './connect-handler';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
  handleConnectionInitAuthenticate,
  parseDynamoDBBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/context';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBConnectionTtlContext,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';
import { createMongoDBLoaders } from './mongodb/loaders';

export function createDefaultParams(): WebSocketHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  const name = 'ws-handler';
  const logger = createLogger(name);

  let mongodb: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    apiGateway: createDefaultApiGatewayParams(logger),
    graphQL: createDefaultSubscriptionGraphQLParams(logger),
    dynamoDB: createDefaultDynamoDBParams(logger),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }
      return handleConnectGraphQLAuth(event, mongodb.collections, apiOptions);
    },
    onConnectionInit: handleConnectionInitAuthenticate,
    async createGraphQLContext() {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }
      return {
        ...createErrorBaseSubscriptionResolversContext(name),
        logger: createLogger('ws-gql-context'),
        mongodb: {
          ...mongodb,
          loaders: createMongoDBLoaders(mongodb),
        },
        options: apiOptions,
      };
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDefaultDynamoDBConnectionTtlContext(apiOptions),
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(createDefaultParams());
