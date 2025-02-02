import {
  createClient,
  ConnectionInitMessage,
  ClientOptions,
  Message,
  MessageType,
} from 'graphql-ws';
import { isObjectLike } from '~utils/type-guards/is-object-like';

export class WebSocketClient {
  readonly client;

  private _connectedCount = 0;
  get connectedCount() {
    return this._connectedCount;
  }

  private socket: WebSocket | null = null;
  private restartRequested = false;

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
    } else {
      this.client.terminate();
      this.restartRequested = true;
    }
  }

  private connectionParams() {
    const payload: ConnectionInitMessage['payload'] = {};

    return payload;
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
      }
    }
  }

  private closed() {
    this._connectionId = null;
  }
}
