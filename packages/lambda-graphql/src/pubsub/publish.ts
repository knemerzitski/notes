import { execute, GraphQLSchema, parse } from 'graphql/index.js';
import { MessageType, NextMessage } from 'graphql-ws';

import { Logger } from '~utils/logging';

import { WebSocketApi } from '../context/apigateway';
import { Subscription, SubscriptionTable } from '../dynamodb/models/subscription';

import {
  FormatError,
  FormatErrorOptions,
  formatUnknownError,
} from '../graphql/format-unknown-error';

import { PubSubEvent } from './subscribe';
import { ObjectLoader } from '../dynamodb/loader';

interface CreatePublisherParams<TGraphQLContext> {
  readonly context: {
    readonly logger: Logger;
    readonly loaders: {
      readonly subscriptions: ObjectLoader<
        SubscriptionTable,
        'queryAllByTopic' | 'queryAllByTopicFilter'
      >;
    };
    readonly schema: GraphQLSchema;
    readonly socketApi: WebSocketApi;
    readonly formatError: FormatError;
    readonly formatErrorOptions?: FormatErrorOptions;
  };
  getGraphQLContext: (connectionId?: string) => Promise<TGraphQLContext>;
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
  publishToCurrentConnection?: boolean;

  /**
   * Filter subscriptions based on payload content equality.
   * On false all topic subscriptions are notified.
   * @default false
   */
  filterPayload?: boolean;
}

export type Publisher = (
  topic: PubSubEvent['topic'],
  payload: PubSubEvent['payload'],
  options?: PublisherOptions
) => Promise<PromiseSettledResult<undefined>[]>;

export function createPublisher<TGraphQLContext>({
  context,
  getGraphQLContext,
  isCurrentConnection = () => false,
}: CreatePublisherParams<TGraphQLContext>): Publisher {
  const { logger, loaders, schema, socketApi } = context;
  return async (topic, payload, options) => {
    logger.info('pubsub:publish', {
      topic,
      payload,
      options,
    });

    const publishToCurrentConnection = options?.publishToCurrentConnection ?? false;

    const subscriptions = await (options?.filterPayload
      ? loaders.subscriptions.queryAllByTopicFilter(topic, payload)
      : loaders.subscriptions.queryAllByTopic(topic));
    logger.info('pubsub:publish', {
      subscriptions: subscriptions.map(({ connectionId, subscription }) => ({
        connectionId,
        subscription,
      })),
    });

    /**
     * Filter out subscription tied to current connection if set in options
     */
    function isRelevantSubscription(sub: Subscription) {
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
            contextValue: {
              ...(await getGraphQLContext(sub.connectionId)),
              eventType: 'publish',
            },
            variableValues: sub.subscription.variables,
            operationName: sub.subscription.operationName,
          });

          const message: NextMessage = {
            id: sub.subscriptionId,
            type: MessageType.Next,
            payload: filteredPayload,
          };

          await socketApi.post({
            ...sub.requestContext,
            message,
          });

          return;
        } catch (err) {
          context.logger.error('publish:subscription', {
            ...sub.requestContext,
            err,
            topic,
            payload,
            options,
            subscription: sub,
          });

          return context.socketApi.post({
            ...sub.requestContext,
            message: {
              type: MessageType.Error,
              id: sub.subscriptionId,
              payload: [
                formatUnknownError(err, context.formatError, {
                  ...context.formatErrorOptions,
                }),
              ],
            },
          });
        }
      });

    return Promise.allSettled(subcriptionPostPromises);
  };
}
