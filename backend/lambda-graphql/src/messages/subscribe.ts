import { GraphQLError, OperationTypeNode, parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';
import { MessageType } from 'graphql-ws';

import { isArray } from '~common/isArray';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { Subscription } from '../dynamodb/models/subscription';
import validateQuery from '../graphql/validateQuery';
import { MessageHandler } from '../message-handler';
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from '../pubsub/subscribe';

export function createSubscribeHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Subscribe, TGraphQLContext, TOnConnectGraphQLContext> {
  return async ({ context, event, message }) => {
    const { connectionId } = event.requestContext;
    context.logger.info('messages:subscribe', {
      connectionId,
      messageId: message.id,
      query: message.payload.query,
    });
    try {
      const connection = await context.models.connections.get({
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
        return context.socketApi.post({
          ...event.requestContext,
          message: {
            type: MessageType.Error,
            id: message.id,
            payload: errors,
          },
        });
      }

      const graphQLContext: SubscriptionContext &
        TGraphQLContext &
        OnConnectGraphQLContext = {
        ...context.graphQLContext,
        ...connection.onConnectGraphQLContext,
        ...createSubscriptionContext(),
      };

      const execContext = buildExecutionContext({
        schema: context.schema,
        document,
        contextValue: graphQLContext,
        variableValues: message.payload.variables,
        operationName: message.payload.operationName,
      });

      // execContext as an array contains GraphQL errors
      if (isArray(execContext)) {
        return context.socketApi.post({
          ...event.requestContext,
          message: {
            type: MessageType.Error,
            id: message.id,
            payload: execContext,
          },
        });
      }

      const operation = execContext.operation.operation;
      if (operation !== OperationTypeNode.SUBSCRIPTION) {
        throw new Error(
          `Invalid operation '${operation}'. Only subscriptions are supported.`
        );
      }

      const { topic, filter, onSubscribe, onAfterSubscribe } =
        getSubscribeFieldResult(execContext);

      context.logger.info('messages:subscribe:onSubscribe', {
        onSubscribe: !!onSubscribe,
      });
      await onSubscribe?.();

      const subscription: Subscription<TOnConnectGraphQLContext> = {
        id: `${connection.id}:${message.id}`,
        topic,
        subscriptionId: message.id,
        subscription: message.payload,
        filter: filter,
        connectionOnConnectGraphQLContext: connection.onConnectGraphQLContext,
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
      await onAfterSubscribe?.();

      // Wait for Connection TTL refresh to be done if needed
      await ttlRefreshPromise;
    } catch (err) {
      context.logger.error('messages:subscribe:error', err as Error, {
        connectionId,
        message,
      });
      // Post GraphQLError
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
        throw err;
      }
    }
  };
}
