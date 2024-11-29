import { InMemoryCache } from '@apollo/client';
import { CacheRestorer } from '../utils/cache-restorer';
import { CacheReadyCallbacks } from '../types';

export function createRunCacheReadyCallbacks({
  callbacks,
  restorer,
  cache,
}: {
  callbacks: CacheReadyCallbacks;
  restorer: CacheRestorer;
  cache: InMemoryCache;
}) {
  void restorer.restored().then(() => {
    for (const callback of callbacks) {
      callback(cache);
    }
  });
}
