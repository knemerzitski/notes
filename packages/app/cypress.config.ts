import './cypress/tasks/load-env';

import { defineConfig } from 'cypress';

import { loadEnvironmentVariables } from '../utils/src/env';
import { MongoClient, ObjectId } from 'mongodb';
import { WebSocket } from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';
import { nanoid } from 'nanoid';
import {
  WebSocketContext,
  GetNoteCollabTextRevisionOptions,
  GetNoteCollabTextRevisionResult,
  WsConnectOptions,
  WsConnectResult,
  WsSubscribeOptions,
  WsSubscribeResult,
  WsGetSubscriptionDataOptions,
  WsGetSubscriptionDataResult,
} from './cypress/types';

import { component_setupNodeEvents, e2e_setupNodeEvents } from './cypress/tasks';

const VITE_APP_PORT = process.env.VITE_APP_PORT ?? 6173;

const API_URL = process.env.VITE_GRAPHQL_HTTP_URL;

const DB_URI = process.env.MONGODB_URI!;
const WS_URL = process.env.VITE_GRAPHQL_WS_URL!;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  component: {
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    setupNodeEvents(on, config) {
      component_setupNodeEvents(on, config);
    },
  },
  e2e: {
    baseUrl: `http://localhost:${VITE_APP_PORT}`,
    env: {
      API_URL,
    },
    setupNodeEvents(on, config) {
      e2e_setupNodeEvents(on, config);

      const wsCtxById: Record<string, WebSocketContext> = {};

      on('task', {
        async getNoteCollabTextRevision(
          options: GetNoteCollabTextRevisionOptions
        ): Promise<GetNoteCollabTextRevisionResult> {
          const mongoClient = new MongoClient(DB_URI);
          await mongoClient.connect();

          const mongoDB = mongoClient.db();

          const noteDoc = await mongoDB.collection('notes').findOne<{ revision: number }>(
            {
              _id: ObjectId.createFromBase64(options.noteId),
            },
            {
              projection: {
                revision: '$collabText.headText.revision',
              },
            }
          );
          if (!noteDoc) {
            throw new Error(`Note not found ${options.noteId}`);
          }

          return {
            revision: noteDoc.revision,
          };
        },
        async wsConnect(options?: WsConnectOptions): Promise<WsConnectResult> {
          const webSocketId = nanoid();
          const ws = new WebSocket(WS_URL, {
            protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
            headers: options?.headers,
          });

          const wsCtx: WebSocketContext = {
            ws,
            receivedDataById: {},
          };
          wsCtxById[webSocketId] = wsCtx;

          return new Promise<WsConnectResult>((res) => {
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
                  webSocketId,
                  connectionId: data.payload.connectionId,
                });
              } else if (typeof data.id === 'string') {
                let dataArr = wsCtx.receivedDataById[data.id];
                if (!dataArr) {
                  dataArr = [];
                  wsCtx.receivedDataById[data.id] = dataArr;
                }
                dataArr.push(data);
              }
            });
          });
        },
        wsSubscribe<TVariables>(
          options: WsSubscribeOptions<TVariables>
        ): WsSubscribeResult {
          const wsCtx = wsCtxById[options.webSocketId];
          if (!wsCtx) {
            throw new Error(`Unknown WebSocket id ${options.webSocketId}`);
          }

          const subscriptionId = nanoid();

          wsCtx.ws.send(
            JSON.stringify({
              id: subscriptionId,
              type: 'subscribe',
              payload: options.subscription,
            })
          );

          return {
            subscriptionId,
          };
        },
        wsGetSubscriptionData(
          options: WsGetSubscriptionDataOptions
        ): WsGetSubscriptionDataResult {
          const wsCtx = wsCtxById[options.webSocketId];
          if (!wsCtx) {
            throw new Error(`Unknown WebSocket id ${options.webSocketId}`);
          }

          const data = wsCtx.receivedDataById[options.subscriptionId] ?? [];

          return {
            data,
          };
        },
      });
    },
  },
});
