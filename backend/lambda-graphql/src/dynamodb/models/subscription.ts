import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

import { OnConnectGraphQLContext } from './connection';

interface SubscriptionKey {
  // Id format `${connectionId}:${subscriptionId}`
  id: string;
}

export interface Subscription<TOnConnectGraphQLContext extends OnConnectGraphQLContext>
  extends SubscriptionKey {
  topic: string;
  createdAt: number;
  connectionId: string;
  subscriptionId: string;
  filter?: Record<string, unknown>;
  connectionOnConnectGraphQLContext?: TOnConnectGraphQLContext;
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
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends Table<SubscriptionKey, Subscription<TOnConnectGraphQLContext>> {
  queryAllByTopic(topic: string): Promise<Subscription<TOnConnectGraphQLContext>[]>;
  queryAllByTopicFilter(
    topic: string,
    filter: Record<string, unknown>
  ): Promise<Subscription<TOnConnectGraphQLContext>[]>;
  queryAllByConnectionId(
    connectionId: string
  ): Promise<Subscription<TOnConnectGraphQLContext>[]>;
}

export function newSubscriptionModel<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(newTableArgs: NewModelParams): SubscriptionTable<TOnConnectGraphQLContext> {
  const table = newModel<SubscriptionKey, Subscription<TOnConnectGraphQLContext>>(
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
