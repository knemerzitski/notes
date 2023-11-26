import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface SubscriptionKey {
  // Id format `${connectionId}:${subscriptionId}`
  id: string;
}

export interface Subscription extends SubscriptionKey {
  topic: string;
  createdAt: number;
  connectionId: string;
  subscriptionId: string;
  filter?: Record<string, unknown>;
  connectionInitPayload?: Record<string, unknown>;
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  subscription: {
    query: string;
    variables?: Readonly<Record<string, unknown>> | null;
    variableValues?: unknown;
    operationName?: string | null;
  };
  ttl: number;
}

export interface SubscriptionTable extends Table<SubscriptionKey, Subscription> {
  queryAllByTopic(topic: string): Promise<Subscription[]>;
  queryAllByTopicFilter(
    topic: string,
    filter: Record<string, unknown>
  ): Promise<Subscription[]>;
  queryAllByConnectionId(connectionId: string): Promise<Subscription[]>;
}

export function newSubscriptionModel(newTableArgs: NewModelParams): SubscriptionTable {
  const table = newModel<SubscriptionKey, Subscription>(newTableArgs);

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
