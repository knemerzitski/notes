import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../events/message';

export const ping: MessageHandler<MessageType.Ping> = async ({ context, event }) => {
  return context.socketApi.post({
    ...event.requestContext,
    message: {
      type: MessageType.Pong,
    },
  });
};
