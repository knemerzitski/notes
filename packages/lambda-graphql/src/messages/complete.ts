import AggregateError from 'aggregate-error';
import { parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';
import { MessageType } from 'graphql-ws';

import { isArray } from '~utils/isArray';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';
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
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Complete, TGraphQLContext, TOnConnectGraphQLContext> {
  return async ({ context, event, message }) => {
    const { connectionId } = event.requestContext;
    context.logger.info('messages:complete', {
      connectionId,
    });
    try {
      const subscription = await context.models.subscriptions.get({
        id: `${connectionId}:${message.id}`,
      });
      if (!subscription) {
        return;
      }

      const graphQLContext: SubscriptionContext &
        TGraphQLContext &
        OnConnectGraphQLContext = {
        ...context.graphQLContext,
        ...subscription.connectionOnConnectGraphQLContext,
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

      const { onComplete } = getSubscribeFieldResult(execContext);

      context.logger.info('messages:onComplete', { onComplete: !!onComplete });
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
