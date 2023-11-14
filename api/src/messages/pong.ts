import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../events/message';

export const pong: MessageHandler<MessageType.Pong> = async () => {
  // OK?
};
