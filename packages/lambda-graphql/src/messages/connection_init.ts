/* eslint-disable unicorn/filename-case */
import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler<
  TGraphQLContext,
  TBaseGraphQLContext,
>(): MessageHandler<MessageType.ConnectionInit, TGraphQLContext, TBaseGraphQLContext> {
  return async (args) => {
    const { event, context } = args;

    // Trigger onConnectionInit callback which can modify baseGraphQLContext
    if (context.onConnectionInit) {
      const connection = await context.models.connections.get({
        id: event.requestContext.connectionId,
      });
      if (!connection) {
        throw new Error('Missing connection record in DB');
      }

      const baseGraphQLContext = context.baseGraphQLContextTransformer.parse(
        connection.baseGraphQLContext
      );

      const newBaseGraphQLContext = await context.onConnectionInit({
        ...args,
        baseGraphQLContext,
      });

      if (newBaseGraphQLContext) {
        await context.models.connections.update(
          {
            id: event.requestContext.connectionId,
          },
          {
            baseGraphQLContext:
              context.baseGraphQLContextTransformer.serialize(newBaseGraphQLContext),
          }
        );
      }
    }

    await context.startPingPong?.({
      connectionId: event.requestContext.connectionId,
      domainName: event.requestContext.domainName,
      stage: event.requestContext.stage,
    });

    // Send message connection acknowledged
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.ConnectionAck,
        payload: {
          connectionId: event.requestContext.connectionId,
        },
      },
    });
  };
}
