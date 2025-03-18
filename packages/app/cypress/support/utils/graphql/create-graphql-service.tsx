import { bootstrapCache } from '../../../../src/bootstrap';
import { createGraphQLService as app_createGraphQLService } from '../../../../src/graphql/create/service';
import { processCacheVersion } from '../../../../src/graphql/utils/process-cache-version';
import {
  APOLLO_CACHE_VERSION,
  createDefaultGraphQLServiceParams,
} from '../../../../src/graphql-service';

export async function createGraphQLService(options?: {
  /**
   * localStorage key where cache is persisted
   * @default false
   */
  storageKey?: string;
  /**
   * @default false
   */
  logging?: boolean;
}) {
  // Ensure cache is not pruged
  processCacheVersion(bootstrapCache, APOLLO_CACHE_VERSION);

  const params = createDefaultGraphQLServiceParams();
  const service = app_createGraphQLService({
    ...params,
    storageKey: options?.storageKey ?? params.storageKey,
    linkOptions: {
      ...params.linkOptions,
      debug: {
        ...params.linkOptions?.debug,
        logging: options?.logging,
      },
    },
  });

  // Wait for cache to be ready
  await service.restorer.restored();

  return service;
}
