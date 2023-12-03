import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface ConnectionKey {
  // connectionId
  id: string;
}

export type OnConnectGraphQLContext = Record<string, unknown>;

export interface Connection<TOnConnectGraphQLContext extends OnConnectGraphQLContext>
  extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  onConnectGraphQLContext?: TOnConnectGraphQLContext;
  hasPonged: boolean;
  // Time to live in seconds, after which record is deleted
  ttl: number;
}

export interface ConnectionTtlContext {
  defaultTtl: () => number;
  tryRefreshTtl: (ttl: number) => number;
}

export type ConnectionTable<TOnConnectGraphQLContext extends OnConnectGraphQLContext> =
  Table<ConnectionKey, Connection<TOnConnectGraphQLContext>>;

export function newConnectionModel<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(newTableArgs: NewModelParams): ConnectionTable<TOnConnectGraphQLContext> {
  const table = newModel<ConnectionKey, Connection<TOnConnectGraphQLContext>>(
    newTableArgs
  );

  return table;
}
