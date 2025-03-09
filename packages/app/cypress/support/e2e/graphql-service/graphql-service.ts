import { bootstrapCache } from '../../../../src/bootstrap';
import { createGraphQLService } from '../../../../src/graphql/create/service';
import { GraphQLService } from '../../../../src/graphql/types';
import { processCacheVersion } from '../../../../src/graphql/utils/process-cache-version';
import {
  APOLLO_CACHE_VERSION,
  createDefaultGraphQLServiceParams,
} from '../../../../src/graphql-service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      graphQLService: typeof graphQLService;
    }
  }
}

export interface GraphQLServiceContext {
  service: GraphQLService;
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
    });

    // Wait for cache to be ready
    await service.restorer.restored();

    return {
      service,
    } satisfies GraphQLServiceContext;
  });
}
Cypress.Commands.add('graphQLService', graphQLService);
