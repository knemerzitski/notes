import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPingHandler<
  TGraphQLContext,
  TBaseGraphQLContext = unknown,
>(): MessageHandler<MessageType.Ping, TGraphQLContext, TBaseGraphQLContext> {
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
