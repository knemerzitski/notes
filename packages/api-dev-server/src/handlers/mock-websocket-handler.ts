import 'source-map-support/register';
import {
  BaseGraphQLContext,
  BaseSubscriptionResolversContext,
  DynamoDBBaseGraphQLContext,
  createErrorBaseSubscriptionResolversContext,
  handleConnectionInitAuthenticate,
  parseDynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import {
  createDefaultDataSources,
  createDefaultDynamoDBConnectionTtlContext,
} from '~api/handler-params';
import { createLogger } from '~utils/logger';
import {
  createMockApiGatewayParams,
  createMockDynamoDBParams,
  createMockMongoDBContext,
  createMockSubscriptionGraphQLParams,
} from '../handler-params';
import WebSocket from 'ws';
import {
  WebSocketHandlerParams,
  createWebSocketHandler,
} from '~lambda-graphql/websocket-handler';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { handleConnectGraphQLAuth } from '~api/connect-handler';

interface MockWebSocketMessageHandlerOptions {
  mongodb?: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;
  sockets?: Record<string, WebSocket>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockCreateDefaultParams(
  options?: MockWebSocketMessageHandlerOptions
): WebSocketHandlerParams<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
> {
  let mongodb = options?.mongodb;
  const sockets = options?.sockets;

  return {
    logger: createLogger('mock:ws-handler'),
    dynamoDB: createMockDynamoDBParams(),
    apiGateway: createMockApiGatewayParams(sockets),
    graphQL: createMockSubscriptionGraphQLParams(),
    async onConnect({ event }) {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return handleConnectGraphQLAuth(mongodb.collections, event);
    },
    async createGraphQLContext() {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      return {
        ...createErrorBaseSubscriptionResolversContext(),
        logger: createLogger('mock:ws-gql-context'),
        mongodb,
        datasources: createDefaultDataSources({
          notes: {
            mongodb,
          },
        }),
      };
    },
    connection: createDefaultDynamoDBConnectionTtlContext(),
    //pingpong: createMockPingPongParams(sockets),
    parseDynamoDBGraphQLContext: parseDynamoDBBaseGraphQLContext,
    onConnectionInit: handleConnectionInitAuthenticate,
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketHandler<
  BaseSubscriptionResolversContext,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
