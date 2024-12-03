/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GRAPHQL_TRANSPORT_WS_PROTOCOL, ConnectionInitMessage } from 'graphql-ws';
import { nanoid } from 'nanoid';
import { WebSocket } from 'ws';

const WS_URL = process.env.VITE_GRAPHQL_WS_URL!;

interface CreateGraphQLWebSocketOptions {
  connectionInitPayload?: ConnectionInitMessage['payload'];
  headers?: Record<string, string>;
}

export interface WebSocketInterface {
  ws: WebSocket;
  connectionId: string;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  subscribe: <TVariables>(
    sub: {
      operationName?: string;
      query?: string;
      variables?: TVariables;
    },
    onNext: (data: any) => void
  ) => void;
}

export async function createGraphQLWebSocket(options?: CreateGraphQLWebSocketOptions) {
  const ws = new WebSocket(WS_URL, {
    protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    headers: options?.headers,
  });

  ws.on('error', (err) => {
    throw err;
  });

  const listeners: Record<string, (data: any) => void> = {};

  return new Promise<WebSocketInterface>((res) => {
    ws.on('message', (rawData) => {
      const data = JSON.parse(String(rawData));
      if (data.type === 'connected') {
        ws.send(
          JSON.stringify({
            type: 'connection_init',
            payload: options?.connectionInitPayload,
          })
        );
      } else if (data.type === 'connection_ack') {
        if (!data.payload.connectionId) {
          throw new Error('Expected "connectionId" in "connection_ack" payload');
        }
        res({
          ws,
          connectionId: data.payload.connectionId,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
          subscribe: <TVariables>(
            sub: {
              operationName?: string;
              query?: string;
              variables?: TVariables;
            },
            onNext: (data: any) => void
          ) => {
            const id = nanoid();

            listeners[id] = onNext;

            ws.send(
              JSON.stringify({
                id,
                type: 'subscribe',
                payload: {
                  operationName: sub.operationName,
                  variables: sub.variables,
                  query: sub.query,
                },
              })
            );
          },
        });
      } else if (typeof data.id === 'string') {
        listeners[data.id]?.(data);
      }
    });
  });
}
