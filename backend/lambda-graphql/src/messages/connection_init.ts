import { MessageType } from 'graphql-ws';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<
  MessageType.ConnectionInit,
  TGraphQLContext,
  TOnConnectGraphQLContext
> {
  return async (args) => {
    const { event, context } = args;

    await context.onConnectionInit?.(args);

    // TODO start pinging to detect early connection closed?

    // Send message connection acknowledged
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.ConnectionAck,
      },
    });
  };
}
