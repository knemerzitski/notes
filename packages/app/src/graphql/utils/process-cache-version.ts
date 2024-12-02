import { BootstrapCache } from '../../bootstrap/utils/bootstrap-cache';

/**
 *
 * @returns true - everything is ok, false - cache needs to be purged
 */
export function processCacheVersion(
  bootstrapCache: BootstrapCache,
  expectedVersion: string
) {
  if (bootstrapCache.get('apolloCacheVersion') !== expectedVersion) {
    bootstrapCache.set('apolloCacheVersion', expectedVersion);
    return false;
  }

  return true;
}
