import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPingHandler<
  TGraphQLContext,
  TPersistGraphQLContext = unknown,
>(): MessageHandler<MessageType.Ping, TGraphQLContext, TPersistGraphQLContext> {
  return async ({ context, event, message }) => {
    await context.onPing?.({ context, event, message });

    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.Pong,
      },
    });
  };
}
