import { OperationTypeNode, parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';
import { MessageType } from 'graphql-ws';

import { isArray } from '~common/isArray';

import { Subscription } from '../dynamodb/models/subscription';
import validateQuery from '../graphql/validateQuery';
import { MessageHandler } from '../message-handler';
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeResult,
} from '../pubsub/subscribe';

export function createSubscribeHandler<
  TGraphQLContext,
  TConnectionGraphQLContext,
>(): MessageHandler<MessageType.Subscribe, TGraphQLContext, TConnectionGraphQLContext> {
  return async ({ context, event, message }) => {
    const { connectionId } = event.requestContext;
    context.logger.info('subscribe', {
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

      const document = parse(message.payload.query);

      const errors = validateQuery({
        schema: context.schema,
        document,
        variables: message.payload.variables,
      });
      if (errors) {
        context.logger.info('subscribe:validateQueryError', { errors });
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
        TConnectionGraphQLContext = {
        ...context.graphQLContext,
        ...connection.graphQLContext,
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
        // should just post error instead of throwing error?
        throw new Error(
          `Invalid operation '${operation}'. Only subscriptions are supported.`
        );
      }

      const { topic, filter } = getSubscribeResult(execContext);

      // TODO trigger subscribe onSubscribe?

      const subscription: Subscription = {
        id: `${connection.id}:${message.id}`,
        topic,
        subscriptionId: message.id,
        subscription: message.payload,
        filter: filter,
        connectionId: connection.id,
        connectionInitPayload: connection.payload,
        requestContext: event.requestContext,
        createdAt: Date.now(),
        ttl: connection.ttl,
      };
      context.logger.info('subscribe:addSubscription', { subscription });

      if (!(await context.models.subscriptions.add(['id'], subscription))) {
        throw new Error(`Subscriber already exists for "${message.id}"`);
      }

      // TODO trigger subscribe onAfterSubscribe?
    } catch (err) {
      context.logger.error('subscribe:error', err as Error, {
        connectionId,
        message,
      });
      throw err;
    }
  };
}
