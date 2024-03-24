import { MessageType } from 'graphql-ws';

import { DynamoDBRecord } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPingHandler<
  TGraphQLContext,
  TBaseGraphQLContext = unknown,
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
>(): MessageHandler<
  MessageType.Ping,
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext
> {
  return async ({ context, event, message }) => {
    await context.onPing?.({ context, event, message });

    return context.socketApi.post({
      ...event.requestContext,
      message: {
        type: MessageType.Pong,
      },
    });
  };
}
