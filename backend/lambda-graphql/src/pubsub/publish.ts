import { execute, parse } from 'graphql';
import { MessageType, NextMessage } from 'graphql-ws';

import { ApolloHttpHandlerContext } from '../apollo-http-handler';

import { PubSubEvent } from './subscribe';

export type Publisher = (
  topic: PubSubEvent['topic'],
  payload: PubSubEvent['payload']
) => Promise<undefined[]>;

export function createPublisher<TGraphQLContext, TConnectionGraphQLContext>(
  context: ApolloHttpHandlerContext<TConnectionGraphQLContext> & {
    graphQLContext: TGraphQLContext;
  }
): Publisher {
  const { logger, models, schema, socketApi } = context;
  return async (topic, payload) => {
    logger.info('pubsub:publish', {
      topic,
      payload,
    });

    const subscriptions = await models.subscriptions.queryAllByTopicFilter(
      topic,
      payload
    );
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
        contextValue: context.graphQLContext,
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
