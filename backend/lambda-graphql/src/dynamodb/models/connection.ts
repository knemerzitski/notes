import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewModelParams, Table, newModel } from '../model';

interface ConnectionKey {
  // connectionId
  id: string;
}

export interface Connection<TGraphQLContext = unknown> extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  graphQLContext: TGraphQLContext;
  // ConnectionInit payload
  payload?: Record<string, unknown>;
  // hasPonged: boolean
  ttl: number;
}

export type ConnectionTable<TGraphQLContext> = Table<
  ConnectionKey,
  Connection<TGraphQLContext>
>;

export function newConnectionModel<TGraphQLContext>(
  newTableArgs: NewModelParams
): ConnectionTable<TGraphQLContext> {
  const table = newModel<ConnectionKey, Connection<TGraphQLContext>>(newTableArgs);

  return table;
}
