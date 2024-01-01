import { MessageType } from 'graphql-ws';

import { OnConnectGraphQLContext } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPongHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(): MessageHandler<MessageType.Pong, TGraphQLContext, TOnConnectGraphQLContext> {
  return async ({ context, event, message }) => {
    await context.onPong?.({ context, event, message });

    await context.models.connections.update(
      { id: event.requestContext.connectionId },
      {
        hasPonged: true,
      }
    );

    return Promise.resolve(undefined);
  };
}
