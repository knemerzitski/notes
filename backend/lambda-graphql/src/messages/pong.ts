import { MessageType } from 'graphql-ws';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPongHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Pong, TGraphQLContext, TOnConnectGraphQLContext> {
  return async ({ context, event, message }) => {
    await context.onPong?.({ context, event, message });

    return Promise.resolve(undefined);
  };
}
