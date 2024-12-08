import {
  createClient,
  ConnectionInitMessage,
  ClientOptions,
  Message,
  MessageType,
} from 'graphql-ws';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { createDeferred, Deferred } from '~utils/deferred';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { isLocalId } from '../../utils/is-local-id';
import { AppContext } from '../types';

export class WebSocketClient {
  readonly client;

  private readonly context;

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

  /**
   * Current userId that was sent during connection_init
   * Server assumes that this is current user
   */
  private _userId: string | null = null;
  get userId() {
    return this._userId;
  }

  private userIdDeferred: Deferred<string> | null = null;

  constructor(context: Pick<AppContext, 'userId'>, options: ClientOptions) {
    this.context = context;
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

  asyncUserId(): Promise<string> {
    if (!this._userId) {
      if (!this.userIdDeferred) {
        this.userIdDeferred = createDeferred<string>();
      }
      return this.userIdDeferred.promise;
    }

    return Promise.resolve(this._userId);
  }

  restart() {
    this._userId = null;

    const userId = this.context.userId;
    if (!userId || isLocalId(userId)) {
      // Don't restart if user is local or not defined
      return;
    }

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
    // Send authentication in connection init
    const userId = this.context.userId;
    if (!userId || isLocalId(userId)) {
      return;
    }

    this._userId = userId;
    this.userIdDeferred?.resolve(userId);
    this.userIdDeferred = null;

    const payload: ConnectionInitMessage['payload'] = {
      headers: {
        [CustomHeaderName.USER_ID]: userId,
      },
    };

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
