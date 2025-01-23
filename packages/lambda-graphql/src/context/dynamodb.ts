import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Logger } from '~utils/logging';

import {
  CompletedSubscriptionTable,
  newCompletedSubscriptionModel,
} from '../dynamodb/models/completed-subscription';

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
    completedSubscriptions: string;
  };
  logger: Logger;
}

export interface DynamoDBContext {
  connections: ConnectionTable;
  subscriptions: SubscriptionTable;
  completedSubscriptions: CompletedSubscriptionTable;
}

export function createDynamoDBContext(params: DynamoDBContextParams): DynamoDBContext {
  params.logger.info('buildDynamoDBContext:new', {
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
    completedSubscriptions: newCompletedSubscriptionModel({
      documentClient,
      tableName: params.tableNames.completedSubscriptions,
      logger: params.logger,
    }),
  };
}
