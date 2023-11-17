import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { ConnectionTable, newModel as newConnectionModel } from '../dynamodb/connection';
import {
  SubscriptionTable,
  newModel as newSubscriptionModel,
} from '../dynamodb/subscription';
import { Logger } from '../utils/logger';

export interface DynamoDbContextConfig {
  clientConfig: DynamoDBClientConfig;
  tableNames: {
    connections: string;
    subscriptions: string;
  };
  logger: Logger;
}

export interface DynamoDbContext {
  connections: ConnectionTable;
  subscriptions: SubscriptionTable;
}

export function buildDynamoDbContext(config: DynamoDbContextConfig): DynamoDbContext {
  config.logger.info('buildDynamoDbContext:new', {
    config: config.clientConfig,
  });

  const client = new DynamoDBClient(config.clientConfig);
  const documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
  return {
    connections: newConnectionModel({
      documentClient,
      tableName: config.tableNames.connections,
      logger: config.logger,
    }),
    subscriptions: newSubscriptionModel({
      documentClient,
      tableName: config.tableNames.subscriptions,
      logger: config.logger,
    }),
  };
}
