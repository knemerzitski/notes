import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface ConnectionKey {
  // connectionId
  id: string;
}

export type DynamoDBRecord = Record<string, unknown>;

export interface Connection<TDynamoDBGraphQLContext extends DynamoDBRecord>
  extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  graphQLContext?: TDynamoDBGraphQLContext;
  hasPonged: boolean;
  // Time to live in seconds, after which record is deleted
  ttl: number;
}

export interface ConnectionTtlContext {
  defaultTtl: () => number;
  tryRefreshTtl: (ttl: number) => number;
}

export type ConnectionTable<TDynamoDBGraphQLContext extends DynamoDBRecord> = Table<
  ConnectionKey,
  Connection<TDynamoDBGraphQLContext>
>;

export function newConnectionModel<TDynamoDBGraphQLContext extends DynamoDBRecord>(
  newTableArgs: NewModelParams
): ConnectionTable<TDynamoDBGraphQLContext> {
  const table = newModel<ConnectionKey, Connection<TDynamoDBGraphQLContext>>(
    newTableArgs
  );

  return table;
}
