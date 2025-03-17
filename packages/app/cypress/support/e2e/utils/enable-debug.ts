export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      enableDebug: () => Chainable<void>;
    }
  }
}

Cypress.Commands.add('enableDebug', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('debug', '*');
  });
});
