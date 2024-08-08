/* eslint-disable unicorn/filename-case */
import { MessageType } from 'graphql-ws';

import { DynamoDBRecord } from '../dynamodb/models/connection';
import { MessageHandler } from '../message-handler';

export function createConnectionInitHandler<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(): MessageHandler<
  MessageType.ConnectionInit,
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext
> {
  return async (args) => {
    const { event, context } = args;

    // Trigger onConnectionInit callback which can modify baseGraphQLContext
    if (context.onConnectionInit) {
      const connection = await context.models.connections.get({
        id: event.requestContext.connectionId,
      });
      if (!connection) {
        throw new Error('Missing connection record in DB');
      }

      const baseGraphQLContext = context.parseDynamoDBGraphQLContext(
        connection.graphQLContext
      );

      const newDynamoDBGraphQLContext = await context.onConnectionInit({
        ...args,
        baseGraphQLContext,
      });

      if (newDynamoDBGraphQLContext) {
        await context.models.connections.update(
          {
            id: event.requestContext.connectionId,
          },
          {
            graphQLContext: newDynamoDBGraphQLContext,
          }
        );
      }
    }

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
