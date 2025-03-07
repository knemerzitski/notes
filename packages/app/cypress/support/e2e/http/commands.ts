import { fetchGraphQL } from '../../../../../utils/src/testing/fetch-graphql';
import { HttpSession } from '../../../../../utils/src/testing/http-session';
import { GraphQLRequest } from '../../../../../utils/src/testing/types';

import { cyRequestFetchFn } from './fetch';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      graphQLSession: typeof graphQLSession;
    }
  }
}

function graphQLSession(
  options?: Omit<ConstructorParameters<typeof HttpSession>[0], 'fetchFn'>
) {
  const session = new HttpSession({
    ...options,
    fetchFn: cyRequestFetchFn,
  });

  const sessionFetchFn = session.fetch.bind(session);

  return cy.wrap({
    session: session,
    request: (
      request: GraphQLRequest,
      options?: {
        url?: string;
      }
    ) => {
      // Must start fetching outside cy.then since `sessionFetchFn` invokes cy.request internally
      // Order of commands must be: cy.request, cy.then
      const responsePromise = fetchGraphQL(request, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        url: options?.url ?? Cypress.env('API_URL'),
        fetchFn: sessionFetchFn,
      });

      return cy.then(async () => {
        return await responsePromise;
      });
    },
  });
}
Cypress.Commands.add('graphQLSession', graphQLSession);
