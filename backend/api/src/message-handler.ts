import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Connection } from 'mongoose';

import { createLogger } from '~common/logger';
import {
  createWebSocketMessageHandler,
  WebSocketMessageHandlerParams,
} from '~lambda-graphql/message-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBParams,
  createDefaultSubscriptionGraphQLParams,
} from './handler-params';
import { BaseGraphQLContext, GraphQLResolversContext } from './schema/context';

export type InitMessageGraphQLContext = Omit<
  GraphQLResolversContext,
  keyof BaseGraphQLContext | keyof SubscriptionContext
>;

export function createDefaultParams(): WebSocketMessageHandlerParams<
  InitMessageGraphQLContext,
  BaseGraphQLContext
> {
  const logger = createLogger('websocket-message-handler');

  return {
    logger,
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
    graphQl: createDefaultSubscriptionGraphQLParams(logger),
    graphQLContext: {
      get mongoose() {
        throw new Error('Mongoose is not available in websocket-message-handler');
        return null as unknown as Connection;
      },
      get request() {
        throw new Error('Request is not available in websocket-message-handler');
        return {
          headers: {},
          multiValueHeaders: {},
        };
      },
      get response() {
        throw new Error('Response is not available in websocket-message-handler');
        return {
          headers: {},
          multiValueHeaders: {},
        };
      },
      publish() {
        throw new Error('Publish should never be called in websocket-message-handler');
      },
    },
  };
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = createWebSocketMessageHandler<
  InitMessageGraphQLContext,
  BaseGraphQLContext
>(createDefaultParams());
