import {
  createClient,
  ConnectionInitMessage,
  ClientOptions,
  Message,
  MessageType,
} from 'graphql-ws';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { AppContext } from './types';

export class WebSocketClient {
  readonly client;

  private readonly context;

  private socket: WebSocket | null = null;
  private restartRequested = false;

  private _connectionId: string | null = null;
  get connectionId() {
    return this._connectionId;
  }

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
    // Send authentication in connection init
    const userId = this.context.userId;
    if (!userId) return;

    const payload: ConnectionInitMessage['payload'] = {
      headers: {
        [CustomHeaderName.USER_ID]: userId,
      },
    };

    return payload;
  }

  private connected(socket: unknown) {
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
