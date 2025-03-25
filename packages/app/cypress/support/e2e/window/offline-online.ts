export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      goOffline: () => Chainable<void>;
      goOnline: () => Chainable<void>;
    }
  }
}

let isOnline = true;

function init(win: Cypress.AUTWindow) {
  if (!Object.getOwnPropertyDescriptor(win.navigator, 'onLine')) {
    Object.defineProperty(win.navigator, 'onLine', {
      get: () => isOnline,
    });
  }
}

function goOfflineBeforeLoad(win: Cypress.AUTWindow) {
  init(win);

  isOnline = false;
  win.dispatchEvent(new win.Event('offline'));
}

Cypress.Commands.add('goOffline', () => {
  Cypress.on('window:before:load', goOfflineBeforeLoad);

  cy.window().then((win) => {
    init(win);

    isOnline = false;
    win.dispatchEvent(new win.Event('offline'));
  });
});

Cypress.Commands.add('goOnline', () => {
  Cypress.off('window:before:load', goOfflineBeforeLoad);

  cy.window().then((win) => {
    init(win);

    isOnline = true;
    win.dispatchEvent(new win.Event('online'));
  });
});
