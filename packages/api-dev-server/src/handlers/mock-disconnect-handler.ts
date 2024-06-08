import 'source-map-support/register';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
  createErrorBaseSubscriptionResolversContext,
  parseDynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import { createDefaultDataSources } from '~api/handler-params';
import { createLogger } from '~utils/logger';
import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockMongoDBContext,
  createMockSubscriptionGraphQLParams,
} from '../handler-params';
import WebSocket from 'ws';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
  WebSocketDisconnectHandlerParams,
  createWebSocketDisconnectHandler,
} from '~lambda-graphql/disconnect-handler';

interface MockWebSocketDisconnectHandlerOptions {
  mongodb?: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;
  sockets?: Record<string, WebSocket>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockCreateDefaultParams(
  options?: MockWebSocketDisconnectHandlerOptions
): WebSocketDisconnectHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  let mongodb = options?.mongodb;
  const sockets = options?.sockets;

  return {
    logger: createLogger('mock:ws-disconnect-handler'),
    dynamoDB: createMockDynamoDBParams(),
    graphQL: createMockSubscriptionGraphQLParams(),
    apiGateway: createMockApiGatewayParams(sockets),
    async createGraphQLContext() {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(),
        logger: createLogger('mock:ws-disconnect-gql-context'),
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
  >(mockCreateDefaultParams());
