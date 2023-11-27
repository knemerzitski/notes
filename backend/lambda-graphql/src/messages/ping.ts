import { MessageType } from 'graphql-ws';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPingHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Ping, TGraphQLContext, TOnConnectGraphQLContext> {
  return async ({ context, event }) => {
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.Pong,
      },
    });
  };
}
