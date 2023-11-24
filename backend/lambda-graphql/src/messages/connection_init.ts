import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler(): MessageHandler<MessageType.ConnectionInit> {
  return async ({ context, event, message }) => {
    // TODO trigger event onConnectionInit?
    // TODO start pinging to detect early connection closed?

    const { payload } = message;
    const { connectionId } = event.requestContext;

    await context.models.connections.update(
      { id: connectionId },
      {
        requestContext: event.requestContext,
        payload,
        // hasPonged: false,
        //ttl: context.defaultTtl(),
      }
    );

    // Send message connection acknowledged
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.ConnectionAck,
      },
    });
  };
}
