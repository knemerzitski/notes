import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../events/message';

export const connection_init: MessageHandler<MessageType.ConnectionInit> = async ({
  context,
  event,
  message,
}) => {
  const { payload } = message;
  const { connectionId } = event.requestContext;

  // TODO trigger event onConnectionInit?

  // TODO start pinging to detect early connection closed?

  // Write connection to persistence
  await context.models.connections.put({
    id: connectionId,
    createdAt: Date.now(),
    requestContext: event.requestContext,
    payload,
    // hasPonged: false,
    ttl: context.defaultTtl(),
  });

  // Send message connection acknowledged
  return context.socketApi.post({
    ...event.requestContext,
    message: {
      type: MessageType.ConnectionAck,
    },
  });
};
