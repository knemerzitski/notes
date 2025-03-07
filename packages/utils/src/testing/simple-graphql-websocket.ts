/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { GRAPHQL_TRANSPORT_WS_PROTOCOL, ConnectionInitMessage } from 'graphql-ws';
import { nanoid } from 'nanoid';
import { GenericWebSocket, GenericWebSocketFactory } from './types';

export interface SimpleGraphQLWebSocket {
  ws: GenericWebSocket;
  connectionId: string;
  subscribe: <TVariables>(
    sub: {
      operationName?: string;
      query?: string;
      variables?: TVariables;
    },
    onNext: (data: any) => void
  ) => void;
}

export async function createSimpleGraphQLWebSocket(
  options: {
    url: string;
    connectionInitPayload?: ConnectionInitMessage['payload'];
    headers?: Record<string, string>;
  },
  ctx: {
    WebSocketClass: GenericWebSocketFactory;
  }
) {
  const url = options.url;

  const ws = new ctx.WebSocketClass(url, {
    protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    headers: options.headers,
  });

  ws.addEventListener('error', ({ error }) => {
    console.error(error);
  });

  const listeners: Record<string, (data: any) => void> = {};

  return new Promise<SimpleGraphQLWebSocket>((res) => {
    ws.addEventListener('message', ({ data }) => {
      const parsedData = JSON.parse(String(data));
      if (parsedData.type === 'connected') {
        ws.send(
          JSON.stringify({
            type: 'connection_init',
            payload: options.connectionInitPayload,
          })
        );
      } else if (parsedData.type === 'connection_ack') {
        if (!parsedData.payload.connectionId) {
          throw new Error('Expected "connectionId" in "connection_ack" payload');
        }
        res({
          ws,
          connectionId: parsedData.payload.connectionId,
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
      } else if (typeof parsedData.id === 'string') {
        listeners[parsedData.id]?.(parsedData);
      }
      // TODO respond to ping?
    });
  });
}
