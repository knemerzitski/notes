import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Logger } from '~utils/logging';

import {
  ConnectionTable,
  DynamoDBRecord,
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

export interface DynamoDBContext<TDynamoDBGraphQLContext extends DynamoDBRecord> {
  connections: ConnectionTable<TDynamoDBGraphQLContext>;
  subscriptions: SubscriptionTable<TDynamoDBGraphQLContext>;
}

export function createDynamoDbContext<TDynamoDBGraphQLContext extends DynamoDBRecord>(
  params: DynamoDBContextParams
): DynamoDBContext<TDynamoDBGraphQLContext> {
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
    connections: newConnectionModel<TDynamoDBGraphQLContext>({
      documentClient,
      tableName: params.tableNames.connections,
      logger: params.logger,
    }),
    subscriptions: newSubscriptionModel<TDynamoDBGraphQLContext>({
      documentClient,
      tableName: params.tableNames.subscriptions,
      logger: params.logger,
    }),
  };
}
