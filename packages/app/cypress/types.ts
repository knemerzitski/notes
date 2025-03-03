import { ConnectionInitMessage } from 'graphql-ws';
import { WebSocket } from 'ws';

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
