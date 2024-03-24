import { MessageType } from 'graphql-ws';

import { DynamoDBRecord } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createPongHandler<
  TGraphQLContext,
  TBaseGraphQLContext = unknown,
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
>(): MessageHandler<
  MessageType.Pong,
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext
> {
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
