import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Logger } from '~common/logger';

import {
  ConnectionTable,
  OnConnectGraphQLContext,
  newConnectionModel as newConnectionModel,
} from '../dynamodb/models/connection';
import {
  SubscriptionTable,
  newSubscriptionModel as newSubscriptionModel,
} from '../dynamodb/models/subscription';

export interface DynamoDBContextParams {
  clientConfig: DynamoDBClientConfig;
  tableNames: {
    connections: string;
    subscriptions: string;
  };
  logger: Logger;
}

export interface DynamoDBContext<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> {
  connections: ConnectionTable<TOnConnectGraphQLContext>;
  subscriptions: SubscriptionTable<TOnConnectGraphQLContext>;
}

export function createDynamoDbContext<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(params: DynamoDBContextParams): DynamoDBContext<TOnConnectGraphQLContext> {
  params.logger.info('buildDynamoDbContext:new', {
    params: params.clientConfig,
  });

  const client = new DynamoDBClient(params.clientConfig);
  const documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
  return {
    connections: newConnectionModel<TOnConnectGraphQLContext>({
      documentClient,
      tableName: params.tableNames.connections,
      logger: params.logger,
    }),
    subscriptions: newSubscriptionModel<TOnConnectGraphQLContext>({
      documentClient,
      tableName: params.tableNames.subscriptions,
      logger: params.logger,
    }),
  };
}
