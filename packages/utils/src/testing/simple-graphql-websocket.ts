/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import { GRAPHQL_TRANSPORT_WS_PROTOCOL, ConnectionInitMessage } from 'graphql-ws';
import { nanoid } from 'nanoid';

import { createDeferred, Deferred } from '../deferred';

import { GenericWebSocket, GenericWebSocketFactory } from './types';

export interface SimpleGraphQLWebSocket {
  ws: GenericWebSocket;
  connectionId: string;
  subscribe: SubscribeFn;
}

export type SubscribeFn = <TData = any, TVariables = any>(
  sub: {
    operationName?: string;
    query?: string;
    variables?: TVariables;
  },
  onNext?: (data: any) => void
) => Subscription<TData>;

export interface Subscription<TData = any> {
  getNext: () => Promise<TData>;
  onNext: (listener: SubscriptionListener) => () => void;
}

export type SubscriptionListener = (data: any) => void;

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

  const listenerById: Record<string, SubscriptionListener> = {};

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
          subscribe: (sub, onNext) => {
            const subListeners = new Set<SubscriptionListener>();
            if (onNext) {
              subListeners.add(onNext);
            }

            const deferredDataQueue: any[] = [];
            let nextDeferredData: Deferred<any> | null = null;

            const id = nanoid();
            listenerById[id] = function (data: any) {
              if (nextDeferredData != null) {
                nextDeferredData.resolve(data);
                nextDeferredData = null;
              } else {
                deferredDataQueue.push(data);
              }

              subListeners.forEach((listener) => {
                listener(data);
              });
            };

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

            return {
              getNext: async () => {
                const data = deferredDataQueue.shift();
                if (data !== undefined) {
                  return data;
                }

                nextDeferredData = nextDeferredData ?? createDeferred();
                return await nextDeferredData.promise;
              },
              onNext: (listener: SubscriptionListener) => {
                subListeners.add(listener);
                return () => {
                  subListeners.delete(listener);
                };
              },
            };
          },
        });
      } else if (typeof parsedData.id === 'string') {
        listenerById[parsedData.id]?.(parsedData);
      }
      // TODO respond to ping?
    });
  });
}
