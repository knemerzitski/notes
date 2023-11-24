import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createPongHandler(): MessageHandler<MessageType.Pong> {
  return async () => {
    return Promise.resolve(undefined);
  };
}
