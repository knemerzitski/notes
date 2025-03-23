import {
  createClient,
  ConnectionInitMessage,
  ClientOptions,
  Message,
  MessageType,
} from 'graphql-ws';

import { createDeferred, Deferred } from '../../../../utils/src/deferred';
import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

export class WebSocketClient {
  readonly client;

  private _connectedCount = 0;
  get connectedCount() {
    return this._connectedCount;
  }

  private socket: WebSocket | null = null;
  private restartRequested = false;

  private deferredConnectionId: Deferred<string> | null = null;
  private _connectionId: string | null = null;
  get connectionId() {
    return this._connectionId;
  }

  constructor(options: ClientOptions) {
    this.client = createClient({
      lazy: false,
      retryAttempts: Infinity,
      connectionParams: this.connectionParams.bind(this),
      on: {
        opened: this.opened.bind(this),
        connected: this.connected.bind(this),
        message: this.message.bind(this),
        closed: this.closed.bind(this),
        ...options.on,
      },
      ...options,
    });
  }

  restart() {
    if (this.socket != null) {
      this.restartRequested = false;
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(4499, 'Terminated');
      }
      this._connectionId = null;
    } else {
      this.client.terminate();
      this.restartRequested = true;
    }
  }

  close() {
    return this.client.dispose();
  }

  private connectionParams() {
    const payload: ConnectionInitMessage['payload'] = {};

    return payload;
  }

  private opened(socket: unknown) {
    if (!(socket instanceof WebSocket)) {
      return;
    }

    /**
     * During testing, server will send message with type: "connected".
     * Must ignore it or socket will be closed.
     */
    if (import.meta.env.DEV) {
      const skipMessageTypes = ['connected'];
      const original_onmessage = socket.onmessage?.bind(socket);
      socket.onmessage = (ev) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { data } = ev;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
        const parsedData = JSON.parse(data);
        if (isObjectLike(parsedData)) {
          const type = parsedData.type;
          if (typeof type === 'string' && skipMessageTypes.includes(type)) {
            // Ignore message
            return;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return original_onmessage?.(ev);
      };
    }
  }

  private connected(socket: unknown) {
    this._connectedCount++;

    if (socket instanceof WebSocket) {
      this.socket = socket;

      if (this.restartRequested) {
        this.restart();
      }
    }
  }

  private message(message: Message) {
    if (message.type === MessageType.ConnectionAck) {
      const payload = message.payload;
      if (!isObjectLike(payload)) {
        return;
      }

      const connectionId = payload.connectionId;
      if (typeof connectionId === 'string' && connectionId.length > 0) {
        this._connectionId = connectionId;
        if (this.deferredConnectionId) {
          this.deferredConnectionId.resolve(connectionId);
          this.deferredConnectionId = null;
        }
      }
    }
  }

  /**
   *
   * @returns A promise that will eventually resolve to `connectionId`
   */
  getConnectionIdDeferred(): Promise<string> {
    if (this._connectionId != null) {
      return Promise.resolve(this._connectionId);
    }

    if (!this.deferredConnectionId) {
      this.deferredConnectionId = createDeferred();
    }

    return this.deferredConnectionId.promise;
  }

  private closed() {
    this._connectionId = null;
  }
}
