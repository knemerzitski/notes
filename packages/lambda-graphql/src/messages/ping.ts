import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPingHandler<TGraphQLContext>(): MessageHandler<
  MessageType.Ping,
  TGraphQLContext
> {
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
