import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { Logger } from '~common/logger';

import {
  ConnectionTable,
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

export interface DynamoDBContext<TPartialContext> {
  connections: ConnectionTable<TPartialContext>;
  subscriptions: SubscriptionTable;
}

export function createDynamoDbContext<TPartialContext>(
  params: DynamoDBContextParams
): DynamoDBContext<TPartialContext> {
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
    connections: newConnectionModel({
      documentClient,
      tableName: params.tableNames.connections,
      logger: params.logger,
    }),
    subscriptions: newSubscriptionModel({
      documentClient,
      tableName: params.tableNames.subscriptions,
      logger: params.logger,
    }),
  };
}
