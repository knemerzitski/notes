import { buildExecutionContext } from 'graphql/execution/execute.js';
import { OperationTypeNode, parse } from 'graphql/index.js';
import { MessageType } from 'graphql-ws';
import { isArray } from '~utils/array/is-array';

import { Subscription } from '../dynamodb/models/subscription';
import { formatUnknownError } from '../graphql/format-unknown-error';
import { validateQuery } from '../graphql/validate-query';
import { MessageHandler, WebSocketMessageGraphQLContext } from '../message-handler';
import { createPublisher } from '../pubsub/publish';
import {
  SubscribeHookError,
  SubscriptionGraphQLContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from '../pubsub/subscribe';
import { BaseGraphQLContext } from '../type';

export function createSubscribeHandler<TGraphQLContext>(): MessageHandler<
  MessageType.Subscribe,
  TGraphQLContext
> {
  return async (args) => {
    const { context, event, message } = args;
    const { connectionId } = event.requestContext;
    context.logger.info('messages:subscribe', {
      connectionId,
      messageId: message.id,
      query: message.payload.query,
    });

    try {
      const connection = await context.loaders.connections.get({
        id: connectionId,
      });
      if (!connection) {
        throw new Error('Missing connection record in DB');
      }

      // Refresh TTL if it will expire soon
      const ttl = context.connection.tryRefreshTtl(connection.ttl);
      const ttlRefreshPromise =
        ttl !== connection.ttl
          ? context.models.connections.update(
              {
                id: connectionId,
              },
              {
                ttl,
              }
            )
          : Promise.resolve();

      const document = parse(message.payload.query);

      const errors = validateQuery({
        schema: context.schema,
        document,
        variables: message.payload.variables,
      });
      if (errors) {
        context.logger.info('messages:subscribe:validateQueryError', { errors });
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        return await context.socketApi.post({
          ...event.requestContext,
          message: {
            type: MessageType.Error,
            id: message.id,
            payload: errors.map((error) =>
              formatUnknownError(error, context.formatError, {
                ...context.formatErrorOptions,
              })
            ),
          },
        });
      }

      const graphQLContextValue: BaseGraphQLContext &
        SubscriptionGraphQLContext &
        WebSocketMessageGraphQLContext &
        TGraphQLContext = {
        ...(await context.createGraphQLContext()),
        ...createSubscriptionContext(),
        eventType: 'subscription',
        logger: context.logger,
        publish: createPublisher<TGraphQLContext>({
          context,
          getGraphQLContext: () => graphQLContextValue,
          isCurrentConnection: (id: string) => connectionId === id,
        }),
      };

      const exeContextOrErrors = buildExecutionContext({
        schema: context.schema,
        document,
        contextValue: graphQLContextValue,
        variableValues: message.payload.variables,
        operationName: message.payload.operationName,
      });

      // exeContext as an array contains GraphQL errors
      if (isArray(exeContextOrErrors)) {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        return await context.socketApi.post({
          ...event.requestContext,
          message: {
            type: MessageType.Error,
            id: message.id,
            payload: exeContextOrErrors.map((error) =>
              formatUnknownError(error, context.formatError, {
                ...context.formatErrorOptions,
              })
            ),
          },
        });
      }
      const exeContext = exeContextOrErrors;

      const operation = exeContext.operation.operation;
      if (operation !== OperationTypeNode.SUBSCRIPTION) {
        throw new Error(
          `Invalid operation '${operation}'. Only subscriptions are supported.`
        );
      }

      const { topic, filter, onSubscribe, onAfterSubscribe, onComplete } =
        await getSubscribeFieldResult(exeContext);

      context.logger.info('messages:subscribe:onSubscribe', {
        onSubscribe: !!onSubscribe,
      });

      try {
        await onSubscribe?.();
      } catch (err) {
        throw new SubscribeHookError('onSubscribe', exeContext, err);
      }

      const subscription: Subscription = {
        id: `${connection.id}:${message.id}`,
        topic,
        subscriptionId: message.id,
        subscription: message.payload,
        filter: filter,
        connectionId: connection.id,
        requestContext: event.requestContext,
        createdAt: Date.now(),
        ttl: connection.ttl,
      };
      context.logger.info('messages:subscribe:addSubscription', { subscription });

      if (!(await context.models.subscriptions.add(['id'], subscription))) {
        throw new Error(`Subscriber already exists for "${message.id}"`);
      }

      context.logger.info('messages:subscribe:onAfterSubscribe', {
        onAfterSubscribe: !!onAfterSubscribe,
      });
      try {
        await onAfterSubscribe?.(subscription.id);
      } catch (err) {
        // Delete subscription on error in onAfterSubscribe
        await context.models.subscriptions.delete({ id: subscription.id });
        throw new SubscribeHookError('onAfterSubscribe', exeContext, err);
      }

      // Check if subscription has already been completed, if so then execute onComplete and delete subscription
      const completedSubscription = await context.models.completedSubscription.get({
        id: subscription.id,
      });
      if (completedSubscription) {
        // Subscription is already completed
        context.logger.info('messages:subscribe:onComplete', {
          onComplete: !!onComplete,
        });
        await onComplete?.(subscription.id);

        await context.models.subscriptions.delete({
          id: subscription.id,
        });
      }

      // Wait for Connection TTL refresh to be done
      await ttlRefreshPromise;
    } catch (err) {
      const { exeContext, hookName, cause } = SubscribeHookError.unwrap(err);
      const postError = cause ?? err;

      context.logger.error('messages:subscribe:error', {
        err: postError,
        connectionId,
        message,
      });

      await context.socketApi.post({
        ...event.requestContext,
        message: {
          type: MessageType.Error,
          id: message.id,
          payload: [
            formatUnknownError(postError, context.formatError, {
              ...context.formatErrorOptions,
              exeContext,
              extraPath: hookName,
            }),
          ],
        },
      });

      throw err;
    }
  };
}
