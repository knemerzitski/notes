import { ApolloCache } from '@apollo/client';

/**
 * Removes `ROOT_SUBSCRIPTION` and calls cache.gc
 * @param cache
 */
export function cacheGc(cache: Pick<ApolloCache<unknown>, 'gc' | 'modify'>) {
  cache.modify({
    id: 'ROOT_SUBSCRIPTION',
    fields(value, { fieldName, DELETE }) {
      return fieldName === '__typename' ? value : DELETE;
    },
  });

  cache.gc();
}
