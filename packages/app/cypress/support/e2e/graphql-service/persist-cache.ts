import { GraphQLServiceContext } from './graphql-service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      persistCache: () => Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  'persistCache',
  { prevSubject: true },
  ({ service }: GraphQLServiceContext) => {
    return cy.then(() => service.persistor.persist());
  }
);
