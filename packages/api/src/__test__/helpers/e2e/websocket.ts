/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WebSocket } from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL, ConnectionInitMessage } from 'graphql-ws';
import { nanoid } from 'nanoid';

const WS_URL = process.env.VITE_GRAPHQL_WS_URL!;

interface CreateGraphQLWebSocketOptions {
  connectionInitPayload?: ConnectionInitMessage['payload'];
  headers?: Record<string, string>;
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

  return new Promise((res) => {
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
        res({
          ws,
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
