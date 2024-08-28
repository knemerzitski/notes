import { GraphQLError, execute, parse } from 'graphql';
import { MessageType, NextMessage } from 'graphql-ws';

import { ApolloHttpHandlerContext } from '../apollo-http-handler';
import { DynamoDBRecord } from '../dynamodb/models/connection';
import { Subscription } from '../dynamodb/models/subscription';

import { PubSubEvent } from './subscribe';

interface CreatePublisherParams<
  TGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> {
  context: ApolloHttpHandlerContext<TDynamoDBGraphQLContext> & {
    graphQLContext: TGraphQLContext;
  };
  /**
   * @returns {boolean} {@link connectionId} belongs to client of current request.
   */
  isCurrentConnection?: (connectionId: string) => boolean;
}

export interface PublisherOptions {
  /**
   * Publish to connection that sent current request.
   * Normally over HTTP request client gets a direct response and
   * only other connections need to be notified.
   * @default false
   */
  publishToCurrentConnection: boolean;

  /**
   * Filter subscriptions based on payload content equality.
   * On false all topic subscriptions are notified.
   * @default false
   */
  filterPayload: boolean;
}

export type Publisher = (
  topic: PubSubEvent['topic'],
  payload: PubSubEvent['payload'],
  options?: PublisherOptions
) => Promise<PromiseSettledResult<undefined>[]>;

export function createPublisher<
  TGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>({
  context,
  isCurrentConnection = () => false,
}: CreatePublisherParams<TGraphQLContext, TDynamoDBGraphQLContext>): Publisher {
  const { logger, models, schema, socketApi } = context;
  return async (topic, payload, options) => {
    logger.info('pubsub:publish', {
      topic,
      payload,
      options,
    });

    const publishToCurrentConnection = options?.publishToCurrentConnection ?? false;

    const subscriptions = await (options?.filterPayload
      ? models.subscriptions.queryAllByTopicFilter(topic, payload)
      : models.subscriptions.queryAllByTopic(topic));
    logger.info('pubsub:publish', {
      subscriptions: subscriptions.map(({ connectionId, subscription }) => ({
        connectionId,
        subscription,
      })),
    });

    /**
     * Filter out subscription tied to current connection if set in options
     */
    function isRelevantSubscription(sub: Subscription<TDynamoDBGraphQLContext>) {
      if (!publishToCurrentConnection) {
        return !isCurrentConnection(sub.connectionId);
      }

      return true;
    }

    const subcriptionPostPromises = subscriptions
      .filter(isRelevantSubscription)
      .map(async (sub) => {
        try {
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
        } catch (err) {
          if (err instanceof GraphQLError) {
            return context.socketApi.post({
              ...sub.requestContext,
              message: {
                type: MessageType.Error,
                id: sub.subscriptionId,
                payload: [err],
              },
            });
          } else {
            context.logger.error('publish:subscription', {
              ...sub.requestContext,
              err,
              topic,
              payload,
              options,
              subscription: sub,
            });
          }
        }
      });

    return Promise.allSettled(subcriptionPostPromises);
  };
}
