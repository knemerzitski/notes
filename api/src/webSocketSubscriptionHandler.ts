import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import {
  APIGatewayEventWebsocketRequestContextV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql';

import {
  ApiGatewayContextConfig,
  WebSocketApi,
  buildApiGatewayContext,
} from './context/apiGateway';
import { DynamoDbContextConfig, buildDynamoDbContext } from './context/dynamoDb';
import { GraphQlContextConfig, buildGraphQlContext } from './context/graphQl';
import { ConnectionTable } from './dynamodb/connection';
import { SubscriptionTable } from './dynamodb/subscription';
import { connect } from './events/connect';
import { disconnect } from './events/disconnect';
import { message } from './events/message';
import { MongooseSubscriptionContext, subscriptionResolvers } from './schema/resolvers';
import typeDefs from './schema/typedefs.graphql';
import { Logger, createLogger } from './utils/logger';

export interface WebSocketSubscriptionHandlerContextConfig {
  graphQl: GraphQlContextConfig<MongooseSubscriptionContext>;
  dynamoDb: DynamoDbContextConfig;
  apiGateway: ApiGatewayContextConfig;
  logger: Logger;
  defaultTtl: () => number;
}

export interface WebSocketSubscriptionHandlerContext {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable;
    subscriptions: SubscriptionTable;
  };
  socketApi: WebSocketApi;
  defaultTtl: () => number;
  logger: Logger;
}

export function getDefaultConfig(): WebSocketSubscriptionHandlerContextConfig {
  const logger = createLogger('graphql-websocket-handler');
  return {
    logger,
    graphQl: {
      logger,
      typeDefs,
      resolvers: subscriptionResolvers,
    },
    dynamoDb: {
      logger,
      clientConfig: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        region: process.env.DYNAMODB_REGION!,
      },
      tableNames: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        connections: process.env.DYNAMODB_CONNECTIONS_TABLE_NAME!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        subscriptions: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE_NAME!,
      },
    },
    apiGateway: {
      logger,
      newClient(config) {
        return new ApiGatewayManagementApiClient({
          ...config,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          region: process.env.API_GATEWAY_MANAGEMENT_REGION!,
        });
      },
    },
    defaultTtl() {
      return Math.floor(Date.now() / 1000) + 1 * 60 * 60; // in seconds, 1 hour
    },
  };
}

type EventType = APIGatewayEventWebsocketRequestContextV2['eventType'];
export type EventHandler = (args: {
  context: WebSocketSubscriptionHandlerContext;
  event: APIGatewayProxyWebsocketEventV2;
}) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;

const eventHandlers: Record<EventType, EventHandler> = {
  CONNECT: connect,
  MESSAGE: message,
  DISCONNECT: disconnect,
};

const defaultResponse: APIGatewayProxyStructuredResultV2 = {
  statusCode: 200,
};

export function createHandler(
  config: WebSocketSubscriptionHandlerContextConfig
): APIGatewayProxyWebsocketHandlerV2 {
  const graphQl = buildGraphQlContext<MongooseSubscriptionContext>(config.graphQl);
  const dynamoDb = buildDynamoDbContext(config.dynamoDb);
  const apiGateway = buildApiGatewayContext(config.apiGateway);

  const logger = config.logger;

  const context: WebSocketSubscriptionHandlerContext = {
    schema: graphQl.schema,
    models: {
      connections: dynamoDb.connections,
      subscriptions: dynamoDb.subscriptions,
    },
    socketApi: apiGateway.socketApi,
    logger: logger,
    defaultTtl: config.defaultTtl,
  };

  logger.info('createHandler');

  return async (event) => {
    try {
      const { eventType } = event.requestContext;

      if (!(eventType in eventHandlers)) {
        logger.info('webSocketSubscriptionHandler:event:unknown', { eventType });
        return defaultResponse;
      }

      const eventHandler = eventHandlers[eventType];

      return (await eventHandler({ context, event })) ?? defaultResponse;
    } catch (err) {
      logger.error('webSocketSubscriptionHandler', err as Error, { event });
      throw err;
    }
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 =
  createHandler(getDefaultConfig());
