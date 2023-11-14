import { APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { Message, MessageType, validateMessage } from 'graphql-ws';

import { complete } from '../messages/complete';
import { connection_init } from '../messages/connection_init';
import { ping } from '../messages/ping';
import { pong } from '../messages/pong';
import { subscribe } from '../messages/subscribe';
import { EventHandler, WebSocketSubscriptionHandlerContext } from '../webSocketSubscriptionHandler';

export type MessageHandler<T extends MessageType> = (args: {
  context: WebSocketSubscriptionHandlerContext;
  event: APIGatewayProxyWebsocketEventV2;
  message: Message<T>;
}) => Promise<APIGatewayProxyStructuredResultV2 | void>;

const messageHandlers = {
  [MessageType.ConnectionInit]: connection_init,
  [MessageType.Subscribe]: subscribe,
  [MessageType.Complete]: complete,
  [MessageType.Ping]: ping,
  [MessageType.Pong]: pong,
};

type MessageHandlerKey = keyof typeof messageHandlers;

export const message: EventHandler = async ({ context, event }) => {
  const message = validateMessage(event.body != null ? JSON.parse(event.body) : null);
  context.logger.info('event:MESSAGE', {
    connectionId: event.requestContext.connectionId,
    type: message.type,
  });

  if (!(message.type in messageHandlers)) {
    throw new Error(`Unsupported message type ${message.type}`);
  }

  const messageHandler: MessageHandler<MessageType> =
    messageHandlers[message.type as MessageHandlerKey];

  try {
    return messageHandler({ context, event, message });
  } catch (e) {
    context.socketApi.delete(event.requestContext);
    // TODO trigger event onError?
  }
};
