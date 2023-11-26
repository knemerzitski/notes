import AggregateError from 'aggregate-error';
import { parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';
import { MessageType } from 'graphql-ws';

import { isArray } from '~common/isArray';

import { MessageHandler } from '../message-handler';
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeResult,
} from '../pubsub/subscribe';

/**
 * Removes subscription item from DynamoDB table; id `${connectionId}:${message.id}`
 */
export function createCompleteHandler<
  TGraphQLContext,
  TConnectionGraphQLContext,
>(): MessageHandler<MessageType.Complete, TGraphQLContext, TConnectionGraphQLContext> {
  return async ({ context, event, message }) => {
    const { connectionId } = event.requestContext;
    context.logger.info('messages:complete', {
      connectionId,
    });
    try {
      const subscriptionPromise = context.models.subscriptions.get({
        id: `${connectionId}:${message.id}`,
      });
      const connectionPromise = context.models.connections.get({
        id: connectionId,
      });
      const [subscription, connection] = await Promise.all([
        subscriptionPromise,
        connectionPromise,
      ]);
      if (!subscription || !connection) {
        return;
      }

      const graphQLContext: SubscriptionContext &
        TGraphQLContext &
        TConnectionGraphQLContext = {
        ...context.graphQLContext,
        ...connection.graphQLContext,
        ...createSubscriptionContext(),
      };

      const execContext = buildExecutionContext({
        schema: context.schema,
        document: parse(subscription.subscription.query),
        contextValue: graphQLContext,
        variableValues: subscription.subscription.variables,
        operationName: subscription.subscription.operationName,
      });

      if (isArray(execContext)) {
        throw new AggregateError(execContext);
      }

      const { onComplete } = getSubscribeResult(execContext);

      context.logger.info('messages:complete');
      await onComplete?.();

      await context.models.subscriptions.delete({ id: `${connectionId}:${message.id}` });
    } catch (err) {
      context.logger.error('messages:complete', err as Error, {
        connectionId,
        message,
      });
      throw err;
    }

    return Promise.resolve(undefined);
  };
}
