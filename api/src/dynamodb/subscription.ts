import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewTableArgs, Table, newTable } from './dynamoDb';

export interface SubscriptionKey extends Readonly<Record<string, unknown>> {
  // Id format `${connectionId}:${subscriptionId}`
  id: string;
}

export interface Subscription extends SubscriptionKey {
  topic: string;
  createdAt: number;
  connectionId: string;
  subscriptionId: string;
  connectionInitPayload?: Record<string, unknown>;
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  subscription: {
    query: string;
    variables?: {
      readonly [variable: string]: unknown;
    } | null;
    variableValues?: unknown;
    operationName?: string | null;
  };
  ttl: number;
}

export interface SubscriptionTable extends Table<SubscriptionKey, Subscription> {
  queryAllByTopic(topic: string): Promise<Subscription[]>;
  queryAllByConnectionId(connectionId: string): Promise<Subscription[]>;
}

export function newModel(newTableArgs: NewTableArgs): SubscriptionTable {
  const table = newTable<SubscriptionKey, Subscription>(newTableArgs);

  return {
    ...table,
    queryAllByTopic(topic: string) {
      return table.queryAll({
        IndexName: 'TopicIndex',
        ExpressionAttributeNames: { '#a': 'topic' },
        ExpressionAttributeValues: { ':1': topic },
        KeyConditionExpression: '#a = :1',
      });
    },
    queryAllByConnectionId(connectionId: string) {
      return table.queryAll({
        IndexName: 'ConnectionIndex',
        ExpressionAttributeNames: { '#a': 'connectionId' },
        ExpressionAttributeValues: { ':1': connectionId },
        KeyConditionExpression: '#a = :1',
      });
    },
  };
}
