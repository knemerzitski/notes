import 'source-map-support/register';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
import { createLogger, Logger } from '~utils/logging';

import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
} from './graphql/types';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultMongoDBContext,
  createDefaultSubscriptionGraphQLParams,
} from './parameters';
import { createMongoDBLoaders } from './mongodb/loaders';
import { PingPongContextParams } from '~lambda-graphql/context/pingpong';
import {
  createErrorBaseSubscriptionResolversContext,
  createDynamoDBConnectionTtlContext,
  handleConnectionInitAuthenticate,
} from './utils/handlers';
import {
  createApiGraphQLContext,
  headersToSerializedBaseGraphQLContext,
  parseDynamoDBBaseGraphQLContext,
} from './graphql/context';

export interface CreateWebSocketHandlerDefaultParamsOptions {
  override?: {
    logger?: Logger;
    gqlContextLogger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
    createDynamoDBParams?: typeof createDefaultDynamoDBParams;
    createApiGatewayParams?: typeof createDefaultApiGatewayParams;
    createDefaultSubscriptionGraphQLParams?: typeof createDefaultSubscriptionGraphQLParams;
  };
  pingPongParams?: PingPongContextParams;
}

export function createWebSocketHandlerDefaultParams(
  options?: CreateWebSocketHandlerDefaultParamsOptions
): WebSocketHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  const name = 'ws-handler';
  const logger = options?.override?.logger ?? createLogger(name);

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    graphQL:
      options?.override?.createDefaultSubscriptionGraphQLParams?.(logger) ??
      createDefaultSubscriptionGraphQLParams(logger),
    apiGateway:
      options?.override?.createApiGatewayParams?.(logger) ??
      createDefaultApiGatewayParams(logger),
    dynamoDB:
      options?.override?.createDynamoDBParams?.(logger) ??
      createDefaultDynamoDBParams(logger),

    onConnectionInit: handleConnectionInitAuthenticate,
    pingpong: options?.pingPongParams,
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    connection: createDynamoDBConnectionTtlContext(apiOptions),

    async onConnect({ event }) {
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }

      const apiContext = createApiGraphQLContext({
        mongoDB,
        options: createDefaultApiOptions(),
      });

      return headersToSerializedBaseGraphQLContext(event.headers, apiContext);
    },

    async createGraphQLContext() {
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }
      return {
        ...createErrorBaseSubscriptionResolversContext(name),
        logger: options?.override?.gqlContextLogger ?? createLogger('ws-gql-context'),
        mongoDB: {
          ...mongoDB,
          loaders: createMongoDBLoaders(mongoDB),
        },
        options: apiOptions,
      };
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(createWebSocketHandlerDefaultParams());
