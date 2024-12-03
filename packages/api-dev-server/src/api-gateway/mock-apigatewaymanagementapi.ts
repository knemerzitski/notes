import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { WebSocket } from 'ws';

export class MockApiGatewayManagementApiClient extends ApiGatewayManagementApiClient {
  sockets: Record<string, WebSocket>;

  constructor(sockets: Record<string, WebSocket>) {
    super();
    this.sockets = sockets;
  }

  private getSocket(id: string): WebSocket {
    const ws = this.sockets[id];
    if (!ws) {
      throw new Error(`WebSocket with id "${id}" doesn't exist`);
    }
    return ws;
  }

  override send(command: unknown): Promise<void> {
    if (command instanceof PostToConnectionCommand) {
      const { input } = command;
      const { ConnectionId, Data } = input;

      if (!ConnectionId) return Promise.resolve();

      const ws = this.getSocket(ConnectionId);
      ws.send(JSON.stringify(Data));
    } else if (command instanceof DeleteConnectionCommand) {
      const { input } = command;
      const { ConnectionId } = input;

      if (!ConnectionId) return Promise.resolve();

      const ws = this.getSocket(ConnectionId);

      ws.close();
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.sockets[ConnectionId];
    } else {
      throw new Error(`Unsupported command "${command?.constructor.name}"`);
    }

    return Promise.resolve();
  }
}

export class MockEmtpyApiGatewayManagementApiClient extends ApiGatewayManagementApiClient {
  override send(): Promise<void> {
    return Promise.resolve();
  }
}
