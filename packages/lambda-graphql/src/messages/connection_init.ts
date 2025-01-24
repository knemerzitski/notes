/* eslint-disable unicorn/filename-case */
import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler<
  TGraphQLContext,
  TPersistGraphQLContext,
>(): MessageHandler<MessageType.ConnectionInit, TGraphQLContext, TPersistGraphQLContext> {
  return async (args) => {
    const { event, context } = args;

    // Trigger onConnectionInit callback which can modify persistGraphQLContext
    if (context.onConnectionInit) {
      const connection = await context.models.connections.get({
        id: event.requestContext.connectionId,
      });
      if (!connection) {
        throw new Error('Missing connection record in DB');
      }

      const persistGraphQLContext = context.persistGraphQLContext.parse(
        connection.persistGraphQLContext
      );

      const newPersistGraphQLContext = await context.onConnectionInit({
        ...args,
        persistGraphQLContext,
      });

      if (newPersistGraphQLContext) {
        await context.models.connections.update(
          {
            id: event.requestContext.connectionId,
          },
          {
            persistGraphQLContext: context.persistGraphQLContext.serialize(
              newPersistGraphQLContext
            ),
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
