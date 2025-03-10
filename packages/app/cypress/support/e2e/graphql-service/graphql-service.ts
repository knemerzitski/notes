import { bootstrapCache } from '../../../../src/bootstrap';
import { createGraphQLService } from '../../../../src/graphql/create/service';
import { GraphQLService } from '../../../../src/graphql/types';
import { processCacheVersion } from '../../../../src/graphql/utils/process-cache-version';
import {
  APOLLO_CACHE_VERSION,
  createDefaultGraphQLServiceParams,
} from '../../../../src/graphql-service';
import { HttpLink } from '@apollo/client';
import { cyFetch } from '../http/cy-fetch';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      graphQLService: typeof graphQLService;
    }
  }
}

interface Controller {
  useCyRequest: boolean;
}

export interface GraphQLServiceResult {
  service: GraphQLService;
  controller: Controller;
}

function graphQLService(options?: {
  /**
   * localStorage key where cache is persisted
   * @default false
   */
  storageKey?: string;
}) {
  return cy.then(async () => {
    // Ensure cache is not pruged
    processCacheVersion(bootstrapCache, APOLLO_CACHE_VERSION);

    const controller: Controller = {
      useCyRequest: false,
    };

    const params = createDefaultGraphQLServiceParams();
    const service = createGraphQLService({
      ...params,
      storageKey: options?.storageKey ?? params.storageKey,
      linkOptions: {
        ...params.linkOptions,
        debug: {
          ...params.linkOptions?.debug,
          logging: false,
        },
      },
      // Use cy.request for fetching
      terminatingLink: new HttpLink({
        fetch: (...args) => (controller.useCyRequest ? cyFetch(...args) : fetch(...args)),
      }),
    });

    // Wait for cache to be ready
    await service.restorer.restored();

    return {
      service,
      controller,
    } satisfies GraphQLServiceResult;
  });
}
Cypress.Commands.add('graphQLService', graphQLService);
