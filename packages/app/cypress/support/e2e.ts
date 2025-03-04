/* eslint-disable @typescript-eslint/no-namespace */
// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';

// Import commands.js using ES2015 syntax:
import {
  e2e_Tasks,
  GetNoteCollabTextRevisionResult,
  WsConnectResult,
  WsSubscribeOptions,
  WsSubscribeResult,
  WsGetSubscriptionDataResult,
  GetNoteCollabTextRevisionOptions,
  WsConnectOptions,
} from '../../cypress-tasks';

// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.Commands.add('resetDatabase', () => {
  return cy.task('resetDatabase');
});

Cypress.Commands.add('getNoteCollabTextRevision', (options) => {
  return cy.task<GetNoteCollabTextRevisionResult>('getNoteCollabTextRevision', options);
});

Cypress.Commands.add('wsConnect', (options) => {
  return cy.task<WsConnectResult>('wsConnect', options).then(({ webSocketId }) => ({
    subscribe: <TVariables>(
      options: Pick<WsSubscribeOptions<TVariables>, 'subscription'>
    ) => {
      return cy
        .task<WsSubscribeResult>('wsSubscribe', { ...options, webSocketId })
        .then(({ subscriptionId }) => {
          return {
            getData: () =>
              cy.task<WsGetSubscriptionDataResult>('wsGetSubscriptionData', {
                webSocketId,
                subscriptionId,
              }),
          };
        });
    },
  }));
});

declare global {
  namespace Cypress {
    type ChainableFn<T> = T extends (...args: (infer TArgs)[]) => infer TReturn
      ? (...args: TArgs[]) => Chainable<Awaited<TReturn>>
      : never;

    interface Chainable {
      /**
       * Resets database deleting all collections/tables/rows/documents
       */
      resetDatabase: ChainableFn<e2e_Tasks['resetDatabase']>;
      getNoteCollabTextRevision(
        options: GetNoteCollabTextRevisionOptions
      ): Chainable<GetNoteCollabTextRevisionResult>;
      /**
       * Connects to API using a WebSocket
       */
      wsConnect(options?: WsConnectOptions): Chainable<{
        subscribe: <TVariables>(
          options: Pick<WsSubscribeOptions<TVariables>, 'subscription'>
        ) => Chainable<{
          getData: () => Chainable<WsGetSubscriptionDataResult>;
        }>;
      }>;
    }
  }
}
