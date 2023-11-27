import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface ConnectionKey {
  // connectionId
  id: string;
}

export interface Connection<TOnConnectGraphQLContext = unknown> extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  onConnectgraphQLContext: TOnConnectGraphQLContext;
  // ConnectionInit payload
  payload?: Record<string, unknown>;
  // hasPonged: boolean
  ttl: number;
}

export type ConnectionTable<TOnConnectGraphQLContext> = Table<
  ConnectionKey,
  Connection<TOnConnectGraphQLContext>
>;

export function newConnectionModel<TOnConnectGraphQLContext>(
  newTableArgs: NewModelParams
): ConnectionTable<TOnConnectGraphQLContext> {
  const table = newModel<ConnectionKey, Connection<TOnConnectGraphQLContext>>(
    newTableArgs
  );

  return table;
}
