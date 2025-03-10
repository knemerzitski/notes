import { GraphQLService } from '../../../../src/graphql/types';
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      persistCache: (options: PersistCacheOptions) => Chainable<void>;
    }
  }
}

interface PersistCacheOptions {
  graphQLService: GraphQLService;
}

Cypress.Commands.add('persistCache', ({ graphQLService }: PersistCacheOptions) => {
  return cy.then(() => graphQLService.persistor.persist());
});
