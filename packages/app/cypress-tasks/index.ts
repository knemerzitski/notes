import { ConnectionInitMessage } from 'graphql-ws';
import { WebSocket } from 'ws';

import {
  setupNodeEvents as _component_setupNodeEvents,
  Tasks as _component_Tasks,
} from './component';
import { setupNodeEvents as _e2e_setupNodeEvents, Tasks as _e2e_Tasks } from './e2e';

export const e2e_setupNodeEvents = _e2e_setupNodeEvents;
export type e2e_Tasks = _e2e_Tasks;

export const component_setupNodeEvents = _component_setupNodeEvents;
export type component_Tasks = _component_Tasks;

// ##################################################

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface GetNoteCollabTextRevisionOptions {
  noteId: string;
}

export interface GetNoteCollabTextRevisionResult {
  revision: number;
}

export interface WsConnectOptions {
  connectionInitPayload?: ConnectionInitMessage['payload'];
  headers?: Record<string, string>;
}

export interface WsConnectResult {
  webSocketId: string;
  connectionId: string;
}

export interface WsSubscribeOptions<TVariables> {
  webSocketId: string;
  subscription: {
    operationName?: string;
    query?: string;
    variables?: TVariables;
  };
}

export interface WsSubscribeResult {
  subscriptionId: string;
}

export interface WsGetSubscriptionDataOptions {
  webSocketId: string;
  subscriptionId: string;
}

export interface WsGetSubscriptionDataResult {
  data: any[];
}

export interface WebSocketContext {
  ws: WebSocket;
  receivedDataById: Record<string, any[]>;
}
