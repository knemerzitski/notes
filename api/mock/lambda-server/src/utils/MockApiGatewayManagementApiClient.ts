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

  async send(command: unknown): Promise<void> {
    if (command instanceof PostToConnectionCommand) {
      const { input } = command as PostToConnectionCommand;
      const { ConnectionId, Data } = input;

      if (!ConnectionId) return;

      const ws = this.getSocket(ConnectionId);
      ws.send(Data.toString());
    } else if (command instanceof DeleteConnectionCommand) {
      const { input } = command as DeleteConnectionCommand;
      const { ConnectionId } = input;

      if (!ConnectionId) return;

      const ws = this.getSocket(ConnectionId);

      ws.close();
      delete this.sockets[ConnectionId];
    } else {
      throw new Error(`Unsupported command "${command?.constructor.name}"`);
    }
  }
}
