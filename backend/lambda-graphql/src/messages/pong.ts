import { MessageType } from 'graphql-ws';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPongHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Pong, TGraphQLContext, TOnConnectGraphQLContext> {
  return async () => {
    return Promise.resolve(undefined);
  };
}
