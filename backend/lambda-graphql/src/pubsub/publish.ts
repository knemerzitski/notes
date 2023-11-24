import { execute, parse } from 'graphql';
import { MessageType, NextMessage } from 'graphql-ws';

import { Logger } from '~common/logger';

import { ApiGatewayContext } from '../context/apigateway';
import { DynamoDBContext } from '../context/dynamodb';
import { GraphQLContext } from '../context/graphql';

import { createSubscriptionContext } from './subscribe';

export type Publisher = (
  topic: string,
  payload: Record<string, unknown>
) => Promise<undefined[]>;

interface CreatePublisherParams<TConnectionGraphQLContex> {
  graphQL: GraphQLContext;
  dynamoDB: DynamoDBContext<TConnectionGraphQLContex>;
  apiGateway: ApiGatewayContext;
  logger: Logger;
}

export function createPublisher<TConnectionGraphQLContex>({
  graphQL: { schema },
  dynamoDB,
  apiGateway: { socketApi },
  logger,
}: CreatePublisherParams<TConnectionGraphQLContex>): Publisher {
  return async (topic, payload) => {
    logger.info('pubsub:publish', { topic, payload });

    // TODO implement subscription filtering?

    const subscriptions = await dynamoDB.subscriptions.queryAllByTopic(topic);
    logger.info('pubsub:publish', {
      subscriptions: subscriptions.map(({ connectionId, subscription }) => ({
        connectionId,
        subscription,
      })),
    });

    const subcriptionPostPromises = subscriptions.map(async (sub) => {
      // Filters event.payload based on subscription query
      const filteredPayload = await execute({
        schema: schema,
        document: parse(sub.subscription.query),
        rootValue: payload,
        contextValue: createSubscriptionContext(),
        variableValues: sub.subscription.variables,
        operationName: sub.subscription.operationName,
      });

      const message: NextMessage = {
        id: sub.subscriptionId,
        type: MessageType.Next,
        payload: filteredPayload,
      };

      return socketApi.post({
        ...sub.requestContext,
        message,
      });
    });

    return Promise.all(subcriptionPostPromises);
  };
}
