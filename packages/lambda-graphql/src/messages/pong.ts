import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPongHandler<
  TGraphQLContext,
  TPersistGraphQLContext = unknown,
>(): MessageHandler<MessageType.Pong, TGraphQLContext, TPersistGraphQLContext> {
  return async ({ context, event, message }) => {
    await context.onPong?.({ context, event, message });

    await context.models.connections.update(
      { id: event.requestContext.connectionId },
      {
        hasPonged: true,
      }
    );

    return Promise.resolve(undefined);
  };
}
