import { WebSocket } from 'ws';

import { createSimpleGraphQLWebSocket } from './simple-graphql-websocket';
import {
  BufferLike,
  GenericWebSocket,
  GenericWebSocketFactory,
  WebSocketEventMap,
} from './types';

class WebSocketAdapter implements GenericWebSocket {
  private readonly ws;

  constructor(...args: ConstructorParameters<GenericWebSocketFactory>) {
    this.ws = new WebSocket(...args);
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void
  ): void {
    this.ws.addEventListener<K>(type, listener);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void
  ): void {
    this.ws.removeEventListener<K>(type, listener);
  }

  send(data: BufferLike, cb?: (err?: Error) => void): void {
    this.ws.send(data, cb);
  }
}

export async function wsCreateSimpleGraphQLWebSocket(
  options: Parameters<typeof createSimpleGraphQLWebSocket>[0]
) {
  return createSimpleGraphQLWebSocket(options, {
    WebSocketClass: WebSocketAdapter,
  });
}
