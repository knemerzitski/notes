import { execute, parse } from 'graphql';
import { MessageType, NextMessage } from 'graphql-ws';

import { ApolloHttpHandlerContext } from '../apollo-http-handler';

import { PubSubEvent, createSubscriptionContext } from './subscribe';

export type Publisher = (
  topic: PubSubEvent['topic'],
  payload: PubSubEvent['payload']
) => Promise<undefined[]>;

export function createPublisher<TConnectionGraphQLContext>({
  logger,
  models,
  schema,
  socketApi,
}: ApolloHttpHandlerContext<TConnectionGraphQLContext>): Publisher {
  return async (topic, payload) => {
    logger.info('pubsub:publish', {
      topic,
      payload,
    });

    // TODO implement subscription filtering?
    const subscriptions = await models.subscriptions.queryAllByTopic(topic);
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
