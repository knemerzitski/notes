import { bootstrapCache } from '../../../../src/bootstrap';
import { createGraphQLService as app_createGraphQLService } from '../../../../src/graphql/create/service';
import { processCacheVersion } from '../../../../src/graphql/utils/process-cache-version';
import {
  APOLLO_CACHE_VERSION,
  createDefaultGraphQLServiceParams,
} from '../../../../src/graphql-service';

export async function createGraphQLService(
  options?: Partial<
    Pick<Parameters<typeof app_createGraphQLService>[0], 'storageKey' | 'logger'>
  > &
    Pick<
      NonNullable<Parameters<typeof app_createGraphQLService>[0]['linkOptions']>,
      'debug'
    >
) {
  // Ensure cache is not pruged
  processCacheVersion(bootstrapCache, APOLLO_CACHE_VERSION);

  const params = createDefaultGraphQLServiceParams();
  const service = app_createGraphQLService({
    ...params,
    storageKey: options?.storageKey ?? params.storageKey,
    logger: options?.logger,
    linkOptions: {
      ...params.linkOptions,
      debug: {
        ...params.linkOptions?.debug,
        ...options?.debug,
      },
    },
  });

  // Wait for cache to be ready
  await service.restorer.restored();

  return service;
}
