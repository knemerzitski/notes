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
      },
    });
  };
}
