import AggregateError from 'aggregate-error';
import { buildExecutionContext } from 'graphql/execution/execute.js';
import { GraphQLError, parse } from 'graphql/index.js';
import { MessageType } from 'graphql-ws';
import { isArray } from '~utils/array/is-array';

import { DynamoDBRecord } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';
import { createPublisher } from '../pubsub/publish';
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from '../pubsub/subscribe';

/**
 * Removes subscription item from DynamoDB table; id `${connectionId}:${message.id}`
 */
export function createCompleteHandler<
  TGraphQLContext,
  TBaseGraphQLContext = unknown,
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
>(): MessageHandler<
  MessageType.Complete,
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext
> {
  return async ({ context, event, message }) => {
    const { connectionId } = event.requestContext;
    context.logger.info('messages:complete', {
      connectionId,
    });
    try {
      const subscriptionId = `${connectionId}:${message.id}`;
      const subscription = await context.models.subscriptions.get({
        id: subscriptionId,
      });
      if (!subscription) {
        // Mark subscription as completed
        // If subscribe is in progress then onComplete will be called from subscribe instead
        await context.models.completedSubscription.put({
          id: subscriptionId,
          ttl: context.completedSubscription.ttl,
        });
        return;
      }

      const baseGraphQLContext = context.parseDynamoDBGraphQLContext(
        subscription.connectionGraphQLContext
      );

      const graphQLContextValue: SubscriptionContext &
        TGraphQLContext &
        TBaseGraphQLContext = {
        ...context.graphQLContext,
        ...baseGraphQLContext,
        ...createSubscriptionContext(),
        publish: createPublisher<TGraphQLContext, TDynamoDBGraphQLContext>({
          context,
          getGraphQLContext: () => graphQLContextValue,
          isCurrentConnection: (id: string) => connectionId === id,
        }),
      };

      const execContext = buildExecutionContext({
        schema: context.schema,
        document: parse(subscription.subscription.query),
        contextValue: graphQLContextValue,
        variableValues: subscription.subscription.variables,
        operationName: subscription.subscription.operationName,
      });

      if (isArray(execContext)) {
        throw new AggregateError(execContext);
      }

      const { onComplete } = await getSubscribeFieldResult(execContext);

      context.logger.info('messages:onComplete', { onComplete: !!onComplete });
      await onComplete?.(subscription.id);

      await context.models.subscriptions.delete({ id: `${connectionId}:${message.id}` });
    } catch (err) {
      if (err instanceof GraphQLError) {
        return context.socketApi.post({
          ...event.requestContext,
          message: {
            type: MessageType.Error,
            id: message.id,
            payload: [err],
          },
        });
      } else {
        context.logger.error('messages:complete', {
          err,
          connectionId,
          message,
        });
        throw err;
      }
    }

    return Promise.resolve(undefined);
  };
}
