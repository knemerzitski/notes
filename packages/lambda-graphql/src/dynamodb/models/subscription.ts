import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

import { DynamoDBRecord } from './connection';

interface SubscriptionKey {
  // Id format `${connectionId}:${subscriptionId}`
  id: string;
}

export interface Subscription<
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
> extends SubscriptionKey {
  topic: string;
  createdAt: number;
  connectionId: string;
  subscriptionId: string;
  filter?: Record<string, unknown>;
  connectionGraphQLContext?: TDynamoDBGraphQLContext;
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  subscription: {
    query: string;
    variables?: Readonly<Record<string, unknown>> | null;
    variableValues?: unknown;
    operationName?: string | null;
  };
  ttl: number;
}

export interface SubscriptionTable<
  TDynamoDBGraphQLContext extends DynamoDBRecord = DynamoDBRecord,
> extends Table<SubscriptionKey, Subscription<TDynamoDBGraphQLContext>> {
  queryAllByTopic(topic: string): Promise<Subscription<TDynamoDBGraphQLContext>[]>;
  queryAllByTopicFilter(
    topic: string,
    filter: Record<string, unknown>
  ): Promise<Subscription<TDynamoDBGraphQLContext>[]>;
  queryAllByConnectionId(
    connectionId: string
  ): Promise<Subscription<TDynamoDBGraphQLContext>[]>;
}

export function newSubscriptionModel<TDynamoDBGraphQLContext extends DynamoDBRecord>(
  newTableArgs: NewModelParams
): SubscriptionTable<TDynamoDBGraphQLContext> {
  const table = newModel<SubscriptionKey, Subscription<TDynamoDBGraphQLContext>>(
    newTableArgs
  );

  return {
    ...table,
    queryAllByTopic(topic: string) {
      return table.queryAll({
        IndexName: 'TopicIndex',
        ExpressionAttributeNames: { '#topic': 'topic' },
        ExpressionAttributeValues: { ':topic': topic },
        KeyConditionExpression: '#topic = :topic',
      });
    },
    queryAllByTopicFilter(topic, filter) {
      return table.queryAllFilter(
        {
          IndexName: 'TopicIndex',
          ExpressionAttributeNames: { '#topic': 'topic' },
          ExpressionAttributeValues: { ':topic': topic },
          KeyConditionExpression: '#topic = :topic',
        },
        filter,
        'filter' // prefix
      );
    },
    queryAllByConnectionId(connectionId: string) {
      return table.queryAll({
        IndexName: 'ConnectionIndex',
        ExpressionAttributeNames: { '#connectionId': 'connectionId' },
        ExpressionAttributeValues: { ':connectionId': connectionId },
        KeyConditionExpression: '#connectionId = :connectionId',
      });
    },
  };
}
