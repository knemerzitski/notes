import { GraphQLService } from '../../../../src/graphql/types';
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      restoreCache: (options: RestoreCacheOptions) => Chainable<void>;
    }
  }
}

interface RestoreCacheOptions {
  graphQLService: GraphQLService;
}

Cypress.Commands.add('restoreCache', ({ graphQLService }: RestoreCacheOptions) => {
  return cy.then(async () => {
    await graphQLService.persistor.restore();
    cy.log('restoreCache', graphQLService.client.cache.extract());
  });
});
