import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface ConnectionKey {
  // connectionId
  id: string;
}

export interface Connection extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  // Merged into GraphQL context during query execution
  // TODO rename to persistGraphQLContext
  baseGraphQLContext?: object;
  hasPonged: boolean;
  // Time to live in seconds, after which record is deleted
  ttl: number;
}

export interface ConnectionTtlContext {
  defaultTtl: () => number;
  tryRefreshTtl: (ttl: number) => number;
}

export type ConnectionTable = Table<ConnectionKey, Connection>;

export function newConnectionModel(newTableArgs: NewModelParams): ConnectionTable {
  const table = newModel<ConnectionKey, Connection>(newTableArgs);

  return table;
}
