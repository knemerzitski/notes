import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';

import { NewTableArgs, Table, newTable } from './dynamoDb';

interface ConnectionKey extends Readonly<Record<string, unknown>> {
  // connectionId
  id: string;
}

export interface Connection extends ConnectionKey {
  createdAt: number;
  // requestContext from $connect event
  requestContext: APIGatewayEventWebsocketRequestContextV2;
  // ConnectionInit payload
  payload?: Record<string, unknown>;
  // hasPonged: boolean
  ttl: number;
}

export interface ConnectionTable extends Table<ConnectionKey, Connection> {}

export function newModel(newTableArgs: NewTableArgs) {
  const table = newTable<ConnectionKey, Connection>(newTableArgs);

  return table;
}
