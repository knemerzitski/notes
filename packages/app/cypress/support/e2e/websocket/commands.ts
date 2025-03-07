import { PartialBy } from '../../../../../utils/src/types';

import { WebSocketTasks } from './setup';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      graphQLWebSocket: typeof graphQLWebSocket;
    }
  }
}

function graphQLWebSocket(
  options?: PartialBy<Parameters<WebSocketTasks['graphQLWebSocketConnect']>[0], 'url'>
) {
  options = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    url: Cypress.env('WS_URL'),
    ...options,
  };
  return cy
    .task<
      Awaited<ReturnType<WebSocketTasks['graphQLWebSocketConnect']>>
    >('graphQLWebSocketConnect', options)
    .then((webSocketId) => {
      // Connected
      return {
        subscribe: (
          options: Parameters<WebSocketTasks['graphQLWebSocketSubscribe']>[0]['options']
        ) => {
          return cy
            .task<ReturnType<WebSocketTasks['graphQLWebSocketSubscribe']>>(
              'graphQLWebSocketSubscribe',
              {
                webSocketId,
                options,
              } satisfies Parameters<WebSocketTasks['graphQLWebSocketSubscribe']>[0]
            )
            .then((subscriptionId) => {
              // Subscribed
              return {
                next: (options?: { timeout?: number }) => {
                  return cy.task<ReturnType<WebSocketTasks['graphQLWebSocketNext']>>(
                    'graphQLWebSocketNext',
                    {
                      webSocketId,
                      subscriptionId,
                    } satisfies Parameters<WebSocketTasks['graphQLWebSocketNext']>[0],
                    {
                      timeout: options?.timeout,
                    }
                  );
                },
              };
            });
        },
      };
    });
}
Cypress.Commands.add('graphQLWebSocket', graphQLWebSocket);
