import { createGraphQLService as app_createGraphQLService } from '../../../../src/graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../../src/graphql-service';

type Options = Parameters<typeof app_createGraphQLService>[0];

export async function createGraphQLService(
  options?: Partial<Pick<Options, 'logger'>> &
    Pick<NonNullable<Options['linkOptions']>, 'debug'> & {
      readonly storageKeyPrefix?: Options['storage']['keyPrefix'];
    }
) {
  // Ensure cache is not pruged
  const params = createDefaultGraphQLServiceParams();
  const service = app_createGraphQLService({
    ...params,
    storage: {
      ...params.storage,
      preferredType: 'localStorage',
      keyPrefix: options?.storageKeyPrefix ?? params.storage.keyPrefix,
    },
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
