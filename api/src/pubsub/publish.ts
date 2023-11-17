import { execute, parse } from 'graphql';
import { MessageType, NextMessage } from 'graphql-ws';

import { ApiGatewayContext } from '../context/apiGateway';
import { DynamoDbContext } from '../context/dynamoDb';
import { GraphQlContext } from '../context/graphQl';
import { buildSubscriptionContext } from '../graphql/buildSubscriptionContext';
import { Logger } from '../utils/logger';

export type Publisher = (
  topic: string,
  payload: Record<string, unknown>
) => Promise<undefined>;

interface CreatePublisherParams {
  graphQl: GraphQlContext;
  dynamoDb: DynamoDbContext;
  apiGateway: ApiGatewayContext;
  logger: Logger;
}

export function createPublisher({
  graphQl: { schema },
  dynamoDb,
  apiGateway: { socketApi },
  logger,
}: CreatePublisherParams): Publisher {
  return async (topic, payload) => {
    logger.info('pubsub:publish', { topic, payload });

    // TODO implement subscription filtering?

    const subscriptions = await dynamoDb.subscriptions.queryAllByTopic(topic);
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
        contextValue: buildSubscriptionContext(),
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
