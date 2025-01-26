/* eslint-disable unicorn/filename-case */
import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler<TGraphQLContext>(): MessageHandler<
  MessageType.ConnectionInit,
  TGraphQLContext
> {
  return async (args) => {
    const { event, context } = args;

    await context.onConnectionInit?.(args);

    await context.startPingPong?.({
      connectionId: event.requestContext.connectionId,
      domainName: event.requestContext.domainName,
      stage: event.requestContext.stage,
    });

    // Send message connection acknowledged
    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.ConnectionAck,
        payload: {
          connectionId: event.requestContext.connectionId,
        },
      },
    });
  };
}
