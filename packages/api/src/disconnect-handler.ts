import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  createWebSocketDisconnectHandler,
  WebSocketDisconnectHandlerParams,
} from '~lambda-graphql/disconnect-handler';
import { createLogger } from '~utils/logger';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  createErrorBaseSubscriptionResolversContext,
  parseDynamoDBBaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/context';
import {
  createDefaultApiGatewayParams,
  createDefaultDataSources,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';

export function createDefaultParams(): WebSocketDisconnectHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  const name = 'ws-disconnect-handler';
  const logger = createLogger(name);

  let mongodb: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    apiGateway: createDefaultApiGatewayParams(logger),
    graphQL: createDefaultSubscriptionGraphQLParams(logger),
    dynamoDB: createDefaultDynamoDBParams(logger),
    async createGraphQLContext() {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(name),
        logger: createLogger('ws-disconnect-gql-context'),
        mongodb,
        datasources: createDefaultDataSources({
          notes: {
            mongodb,
          },
        }),
      };
    },
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createWebSocketDisconnectHandler<
    BaseSubscriptionResolversContext,
    BaseGraphQLContext,
    DynamoDBBaseGraphQLContext
  >(createDefaultParams());
