import { nanoid } from 'nanoid';

import {
  SimpleGraphQLWebSocket,
  Subscription,
} from '../../../../../utils/src/testing/simple-graphql-websocket';

import { wsCreateSimpleGraphQLWebSocket } from '../../../../../utils/src/testing/ws-simple-graphql-websocket';

/**
 * Using tasks to do operations with WebSocket from 'ws' package.
 * Cannot use browser builtin WebSocket since it doesn't support sending
 * custom headers during initial upgrade.
 */
export class WebSocketTasks {
  /**
   * Invoke as a singleton instance or commands will be overwritten by new instance.
   */
  setupNodeEvents(
    on: Cypress.PluginEvents,
    _config: Cypress.PluginConfigOptions
  ): Promise<Cypress.PluginConfigOptions | void> | Cypress.PluginConfigOptions | void {
    on('task', {
      graphQLWebSocketConnect: this.graphQLWebSocketConnect.bind(this),
      graphQLWebSocketSubscribe: this.graphQLWebSocketSubscribe.bind(this),
      graphQLWebSocketNext: this.graphQLWebSocketNext.bind(this),
    });
  }

  static asyncConstructor(_config: Cypress.PluginConfigOptions) {
    return Promise.resolve({});
  }

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    _asyncConstructor: Awaited<ReturnType<(typeof WebSocketTasks)['asyncConstructor']>>
  ) {
    //
  }

  private readonly wsById: Record<string, ConnectedWebSocket> = {};

  private get(id: string): ConnectedWebSocket {
    const ws = this.wsById[id];
    if (!ws) {
      throw new Error(`Unknown ws id "${id}"`);
    }
    return ws;
  }

  async graphQLWebSocketConnect(
    options: Parameters<typeof wsCreateSimpleGraphQLWebSocket>[0]
  ): Promise<string> {
    const id = nanoid();

    this.wsById[id] = new ConnectedWebSocket(
      await wsCreateSimpleGraphQLWebSocket(options)
    );

    return id;
  }

  graphQLWebSocketSubscribe({
    webSocketId,
    options,
  }: {
    webSocketId: string;
    options: Parameters<SimpleGraphQLWebSocket['subscribe']>[0];
  }) {
    return this.get(webSocketId).subscribe(options);
  }

  graphQLWebSocketNext({
    webSocketId,
    subscriptionId,
  }: {
    subscriptionId: string;
    webSocketId: string;
  }) {
    return this.get(webSocketId).get(subscriptionId).getNext();
  }
}

class ConnectedWebSocket {
  private readonly subById: Record<string, Subscription> = {};

  constructor(private readonly ws: SimpleGraphQLWebSocket) {}

  get(id: string): Subscription {
    const sub = this.subById[id];
    if (!sub) {
      throw new Error(`Unknown sub id "${id}"`);
    }
    return sub;
  }

  subscribe(options: Parameters<SimpleGraphQLWebSocket['subscribe']>[0]) {
    const id = nanoid();

    this.subById[id] = this.ws.subscribe(options);

    return id;
  }
}
