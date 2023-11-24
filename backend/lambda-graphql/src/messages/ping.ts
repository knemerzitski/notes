import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPingHandler(): MessageHandler<MessageType.Ping> {
  return async ({ context, event }) => {
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.Pong,
      },
    });
  };
}
